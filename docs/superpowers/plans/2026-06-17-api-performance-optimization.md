# Plano — Otimização de Performance da API

**Data:** 2026-06-17  
**Meta:** reduzir rotas públicas de >1000ms para <400ms (cold) e <30ms (warm cache)

---

## Diagnóstico — O que foi encontrado

### Bug crítico: cache keys existem mas nunca são lidos

Em `post.service.ts`, os métodos de leitura pública **nunca usam o cache** — eles só invalidam. As chaves `cacheKeys.postsList`, `cacheKeys.postsFeatured`, `cacheKeys.postsMostViewed` e `cacheKeys.post(slug)` são deletadas nas mutações mas **nunca populadas** nas leituras. Todo request vai direto ao banco.

```ts
// Hoje: lê do banco sempre
async getPublicBySlug(slug: string) {
  const post = await repository.findPublishedBySlug(slug); // DB toda vez
  ...
}

// Deveria ser:
async getPublicBySlug(slug: string) {
  return cacheProvider.wrap(cacheKeys.post(slug), cacheTTL.post, () =>
    repository.findPublishedBySlug(slug)
  );
}
```

### Bug crítico 2: `Cache-Control: no-store` em TODAS as rotas `/api`

Em `app.ts`, há um middleware que aplica `no-store, no-cache` em **todo `/api`**, incluindo rotas públicas. Isso impede cache no browser e em CDNs mesmo para conteúdo estático como `/api/public/theme` e `/api/public/nav`.

```ts
app.use('/api', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, ... });
  next();
});
```

Esse header deveria ser restrito a rotas admin, não às públicas.

### Problema 3: `getBlogHome` faz 4 queries sequenciais sem cache

`PostService.getBlogHome()` executa:
1. `repository.listFeatured(3)` → DB
2. Se vazio: `repository.listPublished()` → DB **sem limit** (busca TODOS os posts)
3. `repository.listMostViewed(3, [])` → DB
4. `repository.paginatePublished(...)` → DB (2 queries dentro de `$transaction`)

Total: 4–5 queries sequenciais, sem cache, sem paralelização. É a rota mais lenta.

### Problema 4: `/public/site-settings` sem cache

`SiteSettingsService.getPublic()` bate no banco a cada request. O `/public/theme` já tem cache Redis permanente, mas `/public/site-settings` (que retorna dados parecidos) não tem nenhum cache.

### Problema 5: `console.log` em produção no `PageRepository`

`page.repository.ts` tem 4 `console.log` em `findAll()`. Além de vazar dados internos nos logs, adiciona overhead no I/O de log em produção.

### Problema 6: `incrementViews` bloqueia a resposta

O endpoint `POST /public/blog/posts/:id/view` faz `findPublishedById` + `update` + `cacheProvider.del` antes de responder. O usuário espera a atualização do banco antes de receber 200. Isso é desnecessário para uma contagem de views.

### Problema 7: fallback em `getBlogHome` busca TODOS os posts

Se não há posts em destaque (`featured.length === 0`), o código chama `repository.listPublished()` sem limit. Com 100+ posts publicados, isso retorna todas as linhas.

### Problema 8: índice composto faltando no `Post`

A query mais frequente é `WHERE status = 'published' ORDER BY publishedAt DESC`. O schema tem `@@index([status])` e `@@index([publishedAt])` separados, mas falta o composto `(status, publishedAt)` que o PostgreSQL usaria diretamente.

---

## Mudanças a implementar

### Fix 1 — Adicionar cache nas leituras públicas de posts

**Arquivo:** `server/src/services/post.service.ts`

Envolver todos os 5 métodos de leitura pública com `cacheProvider.wrap`:

```ts
// 1. Post individual
async getPublicBySlug(slug: string): Promise<PostWithMedia> {
  const post = await cacheProvider.wrap(
    cacheKeys.post(slug),
    cacheTTL.post,
    () => repository.findPublishedBySlug(slug)
  );
  if (!post) throw new HttpError(404, 'Post not found');
  return post;
}

// 2. Posts paginados (com chave que inclui os filtros)
async listPaginated(filters?: PostFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 9;
  const search = filters?.search ?? '';
  const key = `${cacheKeys.postsList}:p${page}:l${limit}:q${search}`;
  return cacheProvider.wrap(key, cacheTTL.postsList, () =>
    repository.paginatePublished(filters)
  );
}

// 3. Posts em destaque
async listFeatured(limit = 3) {
  return cacheProvider.wrap(cacheKeys.postsFeatured, cacheTTL.featuredPosts, () =>
    repository.listFeatured(limit)
  );
}

// 4. Posts mais vistos
async listMostViewed(limit = 3, excludeIds?: string[]) {
  // excludeIds é passado pelo getBlogHome para filtrar os featured já exibidos.
  // Para não explodir o cache com chaves por combinação de excludeIds,
  // cachear apenas a versão sem exclusão (chamada direta de /public/blog/most-viewed)
  // e deixar o getBlogHome cacheado como um todo (Fix 2).
  if (!excludeIds?.length) {
    return cacheProvider.wrap(cacheKeys.postsMostViewed, cacheTTL.mostViewedPosts, () =>
      repository.listMostViewed(limit, [])
    );
  }
  return repository.listMostViewed(limit, excludeIds);
}

// 5. Blog home (ver Fix 2 abaixo)
```

**Invalidação já existente funciona corretamente** — `invalidateCache` em create/update/delete/publish/unpublish já deleta todos esses keys. Nenhuma mudança necessária lá.

---

### Fix 2 — Refatorar e cachear `getBlogHome`

**Arquivo:** `server/src/services/post.service.ts`

Dois problemas simultâneos: queries sequenciais e ausência de cache.

```ts
async getBlogHome() {
  return cacheProvider.wrap(cacheKeys.blogHome, cacheTTL.blogHome, async () => {
    // Paralelizar featured e mostViewed (independentes entre si)
    const [featuredRaw, mostViewed] = await Promise.all([
      repository.listFeatured(3),
      repository.listMostViewed(3, [])
    ]);

    // Fallback: se não há destaques, usar os 3 mais recentes
    // Usar paginatePublished com limit:3 em vez de listPublished() sem limit
    const featured =
      featuredRaw.length > 0
        ? featuredRaw
        : (await repository.paginatePublished({ page: 1, limit: 3 })).items;

    const featuredIds = featured.map((p) => p.id);
    const mostViewedExcluded = mostViewed.filter((p) => !featuredIds.includes(p.id));
    const excludeIds = [...featuredIds, ...mostViewed.map((p) => p.id)];

    const latest = await repository.paginatePublished({ page: 1, limit: 6, excludeIds });

    return {
      featured: featured.slice(0, 3),
      mostViewed: mostViewedExcluded,
      latest
    };
  });
}
```

**Adicionar `blogHome` à invalidação:**

```ts
private async invalidateCache(slug?: string) {
  const keys = [
    cacheKeys.postsList,
    cacheKeys.postsFeatured,
    cacheKeys.postsMostViewed,
    cacheKeys.blogHome,  // <- NOVO
  ];
  if (slug) keys.push(cacheKeys.post(slug));
  await cacheProvider.del(keys);
}
```

Obs: listas paginadas com filtros (`posts:list:p2:l9:q...`) não são limpas automaticamente. Com TTL curto (60s) isso é aceitável — um novo post pode demorar até 60s para aparecer na paginação, o que é razoável.

---

### Fix 3 — Cache de `SiteSettings` público

**Arquivo:** `server/src/services/siteSettings.service.ts`

```ts
async getPublic(): Promise<SiteSettingsInput> {
  return cacheProvider.wrap(cacheKeys.siteSettings, cacheTTL.siteSettings, async () => {
    const settings = await this.ensureSettings();
    // ... normalização existente ...
    return normalizedResult;
  });
}
```

**Invalidar cache no update:**  
Em `server/src/modules/admin/siteSettings.controller.ts`, após `service.update(payload)`, adicionar:

```ts
await cacheProvider.del(cacheKeys.siteSettings);
```

(já há `invalidateThemeCache()` para o Redis separado do tema — manter ambos)

---

### Fix 4 — Separar `Cache-Control` por tipo de rota

**Arquivo:** `server/src/app.ts`

Substituir o middleware global de `no-store` por dois middlewares específicos:

```ts
// REMOVER o middleware atual que aplica no-store a todo /api:
// app.use('/api', (_req, res, next) => { res.set({ 'Cache-Control': 'no-store' ... }); next(); });

// Rotas admin: sem cache (comportamento atual)
app.use('/api/admin', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Rotas de autenticação: sem cache
app.use('/api/login', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});
app.use('/api/logout', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});

// Rotas públicas com dados estáveis: cache de 60s no browser
// (o servidor já usa Redis/memory cache interno; o browser cache é adicional)
app.use('/api/public', (_req, res, next) => {
  // Permite cache de 60s no browser mas revalida
  res.set({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' });
  next();
});
```

Isso permite que o browser e CDNs armazenem respostas públicas por 60s, reduzindo requests repetidos do mesmo usuário a zero latência.

---

### Fix 5 — Remover `console.log` de produção no `PageRepository`

**Arquivo:** `server/src/repositories/page.repository.ts`

Remover as 4 chamadas de `console.log` dentro de `findAll()`. O método deve ser limpo e silencioso:

```ts
findAll(options?: { excludePageKey?: string; excludeSlug?: string }): Promise<Page[]> {
  const filters: Prisma.PageWhereInput[] = [];
  if (options?.excludePageKey) {
    filters.push({
      OR: [{ pageKey: null }, { pageKey: { not: options.excludePageKey } }]
    });
  }
  if (options?.excludeSlug) {
    filters.push({ slug: { not: options.excludeSlug } });
  }
  const where: Prisma.PageWhereInput | undefined = filters.length ? { AND: filters } : undefined;
  return prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' } });
}
```

---

### Fix 6 — `incrementViews` fire-and-forget

**Arquivo:** `server/src/modules/public/posts.controller.ts`

Responder imediatamente e atualizar views em background:

```ts
export async function incrementView(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    res.setHeader('Cache-Control', 'no-store');
    // Responder imediatamente — não bloquear o usuário esperando o DB
    sendSuccess(res, { queued: true });
    // Atualizar em background (sem await)
    service.incrementViews(id).catch(() => {
      // falha silenciosa — views é não-crítico
    });
  } catch (error) {
    return next(error);
  }
}
```

---

### Fix 7 — Adicionar chaves e TTLs faltantes em `cache.ts`

**Arquivo:** `server/src/config/cache.ts`

```ts
export const cacheKeys = {
  nav: 'nav:public',
  home: 'home:public',
  siteSettings: 'site-settings:public',   // NOVO
  blogHome: 'posts:blog-home',             // NOVO
  postsList: 'posts:list:published',
  postsFeatured: 'posts:list:featured',
  postsMostViewed: 'posts:list:most-viewed',
  post: (slug: string) => `post:public:${slug}`,
  page: (slug: string) => `page:public:${slug}`
};

export const cacheTTL = {
  nav: env.CACHE_TTL_NAV,
  home: env.CACHE_TTL_HOME,
  page: env.CACHE_TTL_PAGE,
  post: env.CACHE_TTL_POST,
  postsList: env.CACHE_TTL_POSTS_LIST,
  featuredPosts: env.CACHE_TTL_POSTS_LIST,
  mostViewedPosts: env.CACHE_TTL_POSTS_LIST,
  siteSettings: 3600,    // NOVO — 1h, invalida no update
  blogHome: 120          // NOVO — 2min, dados compostos mudam mais
};
```

---

### Fix 8 — Índice composto no PostgreSQL

**Arquivo:** `server/prisma/schema.prisma`

Adicionar índice composto `(status, publishedAt)` que cobre a query mais frequente (`WHERE status = 'published' ORDER BY publishedAt DESC`):

```prisma
model Post {
  // ... campos existentes ...

  @@index([status])
  @@index([publishedAt])
  @@index([isFeatured, status])
  @@index([status, views])
  @@index([status, publishedAt])   // NOVO — cobre o orderBy mais comum
}
```

Depois rodar:
```bash
npx prisma migrate dev --name add-post-status-publishedat-index
```

---

## Arquivos modificados — resumo

| Arquivo | Mudança |
|---|---|
| `server/src/config/cache.ts` | + `cacheKeys.siteSettings`, `cacheKeys.blogHome`, `cacheTTL.siteSettings`, `cacheTTL.blogHome` |
| `server/src/services/post.service.ts` | + `cacheProvider.wrap` em 4 métodos + refator `getBlogHome` (paralelo + cache + fallback seguro) + `cacheKeys.blogHome` na invalidação |
| `server/src/services/siteSettings.service.ts` | + `cacheProvider.wrap` em `getPublic` |
| `server/src/modules/admin/siteSettings.controller.ts` | + `cacheProvider.del(cacheKeys.siteSettings)` no `updateSiteSettings` |
| `server/src/modules/public/posts.controller.ts` | fire-and-forget em `incrementView` |
| `server/src/repositories/page.repository.ts` | remover 4× `console.log` do `findAll` |
| `server/src/app.ts` | separar middleware de `Cache-Control` por tipo de rota |
| `server/prisma/schema.prisma` | + `@@index([status, publishedAt])` no model `Post` |

---

## Ordem de execução recomendada para o Haiku

1. `cache.ts` — adicionar as novas chaves e TTLs
2. `post.service.ts` — envolver os 4 métodos com `wrap` + refatorar `getBlogHome`
3. `siteSettings.service.ts` — `wrap` em `getPublic`
4. `siteSettings.controller.ts` (admin) — `del` do cache no update
5. `page.repository.ts` — remover `console.log`
6. `posts.controller.ts` — fire-and-forget no `incrementView`
7. `app.ts` — separar middleware de Cache-Control
8. `schema.prisma` — novo índice + rodar migration

---

## Impacto esperado por rota

| Rota | Antes (estimado) | Depois (cold cache) | Depois (warm cache) |
|---|---|---|---|
| `GET /public/theme` | ~30ms | ~30ms | ~5ms |
| `GET /public/nav` | ~200ms | ~200ms | ~5ms |
| `GET /public/home` | ~300ms | ~300ms | ~5ms |
| `GET /public/pages/:slug` | ~300ms | ~300ms | ~5ms |
| `GET /public/blog/home` | **~1200ms** | ~400ms | **~10ms** |
| `GET /public/blog/posts` | **~800ms** | ~300ms | **~10ms** |
| `GET /public/blog/featured` | **~500ms** | ~200ms | **~5ms** |
| `GET /public/blog/most-viewed` | **~500ms** | ~200ms | **~5ms** |
| `GET /public/blog/:slug` | **~600ms** | ~250ms | **~5ms** |
| `GET /public/site-settings` | **~400ms** | ~400ms | **~5ms** |
| `POST /public/blog/posts/:id/view` | ~300ms | **~5ms** (fire-and-forget) | **~5ms** |

Cold cache ocorre apenas após deploy ou após o TTL expirar. Com Redis configurado, o cache sobrevive a restarts do servidor.

---

## Checklist de validação

- [ ] `cacheProvider.wrap` está sendo usado (não apenas `del`) nos 4 métodos do PostService
- [ ] `getBlogHome` usa `Promise.all` para featured + mostViewed
- [ ] Fallback de featured usa `paginatePublished({ limit: 3 })`, não `listPublished()` sem limit
- [ ] `cacheKeys.blogHome` está sendo invalidado em `invalidateCache`
- [ ] `siteSettings.getPublic` está cacheado e o controller admin invalida o cache no update
- [ ] Nenhum `console.log` em `page.repository.ts`
- [ ] `incrementView` responde antes de atualizar o banco
- [ ] Middleware `Cache-Control: no-store` não se aplica mais a `/api/public`
- [ ] Migration rodou sem erro: `@@index([status, publishedAt])`
- [ ] TypeScript strict: sem erros de tipo em todos os arquivos modificados
