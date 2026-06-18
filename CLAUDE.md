# CLAUDE.md — crisjageneski.com.br

Site institucional de psicóloga com CMS próprio baseado em blocos.

## Stack

- **Frontend:** React 19 + Vite + TypeScript strict + React Query + Axios + Tiptap (editor de texto rico)
- **Backend:** Express 5 + TypeScript + Prisma + PostgreSQL
- **Storage:** Supabase (imagens/mídia)
- **Cache:** Redis (opcional, configurável via `REDIS_URL`) para cache permanente de configurações públicas
  - Endpoint `/api/public/theme` retorna toda `SiteSettings` cacheada em Redis → ~10-100x mais rápido
  - Inclui: tema, branding, sociais, WhatsApp, horários, etc
  - Cache vive para sempre, só morre ao atualizar configurações no admin
  - Graceful degradation: funciona sem Redis (busca do banco automaticamente)
- **Auth:** JWT em cookie `httpOnly` (`cris_session`, setado pelo servidor). O client mantém só uma flag não-sensível em `localStorage` (`cris_authed`) para decidir a UI de rota — a segurança real é sempre o cookie, validado a cada request

## Como rodar

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env
cp client/.env.example client/.env.local

# 2. Instalar dependências
npm install
cd client && npm install && cd ..

# 3. Banco de dados
npx prisma migrate dev

# 4. (Opcional) Redis para cache de tema
# Instalar Redis localmente ou usar cloud service
# Adicionar REDIS_URL ao .env se quiser usar cache
# Exemplo: REDIS_URL=redis://:password@localhost:6379

# 5. Rodar em desenvolvimento
# Terminal 1 — servidor
cd server && npm run dev

# Terminal 2 — cliente
cd client && npm run dev
```

O cliente roda em http://localhost:5173 e faz proxy de `/api` para o servidor em `localhost:4000`.

### Redis (Opcional mas Recomendado)

Se Redis está configurado (via `REDIS_URL`):
- **Configuração do Site:** Cachada permanentemente em Redis (sem TTL). Cache só morre ao atualizar no admin.
- **O que é cacheado:** Tema, branding, sociais, WhatsApp, horários, logo, etc (tudo de `SiteSettings`)
- **Benefício:** Primeira carga do site **10-100x mais rápida** (elimina database query)
- **Fallback:** Se Redis cair, app continua funcionando (busca do banco automaticamente)
- **Sem Redis:** App funciona normalmente, mas faz query ao banco a cada load

Para development local com Redis:
```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# Ou instalação nativa (macOS)
brew install redis
redis-server
```

Adicionar ao `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Estrutura do projeto

```
/
├── client/          Frontend React (Vite)
│   └── src/
│       ├── api/         Axios instance + funções de query
│       ├── assets/      Assets estáticos (SVGs, imagens)
│       ├── blocks/      Registry de blocos + renderer/Form/schema por tipo
│       ├── components/  Componentes React reutilizáveis
│       │   └── RichTextEditor/  Editor de texto rico (toolbar + sub-modais + hooks)
│       ├── hooks/
│       │   └── queries/ Custom hooks de React Query (usePages, useArticles, useMedia, ...)
│       ├── pages/       Páginas (públicas e admin)
│       ├── types/       Tipos TypeScript por domínio
│       │   ├── blocks.ts    Tipos dos 16 blocos (PageBlock union)
│       │   ├── layout.ts    PageLayoutV2, PageSection, Page
│       │   ├── content.ts   Article, SiteSettings, FormSubmission
│       │   ├── auth.ts      User, Media, NavbarItem, SocialLink
│       │   └── index.ts     Re-exporta tudo
│       └── utils/       Funções utilitárias puras
├── server/          Backend Express (TypeScript)
│   └── src/
│       ├── routes/      Rotas da API
│       ├── middleware/  Auth, rate limit, upload
│       └── services/    Lógica de negócio
├── prisma/          Schema do banco e migrações
└── docs/            Documentação e planos de execução
    └── superpowers/
        ├── specs/   Documentos de design/auditoria
        └── plans/   Planos de implementação passo a passo
```

## Sistema de blocos

Páginas são compostas por **seções** → **colunas** → **blocos**. O JSON é salvo no campo `layout` da tabela `Page` (PostgreSQL).

Os 16 tipos de bloco estão definidos em `client/src/types/blocks.ts` como discriminated union (`PageBlock`). O banco salva o JSON bruto — o frontend renderiza usando `PageRenderer.tsx`.

**Tipos de bloco disponíveis:**
`text`, `image`, `button`, `buttonGroup`, `cards`, `cta`, `form`, `hero`, `media-text`, `pills`, `recent-posts`, `services`, `social-links`, `span`, `whatsapp-cta`, `contact-info`

**Adicionar um novo bloco:**
1. Criar pasta `client/src/blocks/<nome>/` com `renderer.tsx`, `Form.tsx`, `schema.ts`
2. Adicionar 1 linha no `client/src/blocks/registry.ts`
3. Adicionar o novo tipo ao union `PageBlock` em `client/src/types/blocks.ts`
4. Adicionar preset em `sectionPresets.ts` se quiser que apareça na galeria

## Importações

Use o alias `@/` para imports dentro de `client/src/`:
```typescript
import { Modal } from '@/components/AdminUI';
import type { PageBlock } from '@/types';
import type { TextBlockData } from '@/types/blocks';
```

## API

- Rotas públicas: `/api/public/...` — sem autenticação
- Rotas admin: `/api/admin/...` — requerem o cookie `httpOnly` `cris_session` (setado por `POST /api/login`, limpo por `POST /api/logout`)
- Upload de mídia: `/api/media/upload` — multipart/form-data
- Submissão de formulários: `/api/forms/submit`
- `CLIENT_URL` (env do servidor) precisa apontar para a origem do client (CORS + cookie)

## Convenções

- TypeScript strict — sem `any` sem motivo explícito e comentário justificando
- Componentes em PascalCase, hooks com prefixo `use`
- Funções utilitárias puras em `utils/` (sem efeitos colaterais)
- Sem `console.log` em código de produção
- Sem `window.confirm` ou `window.prompt` — usar `Modal` e `ConfirmModal` de `components/AdminUI.tsx`
- Placeholders de imagem: usar `@/assets/image-placeholder.svg`, nunca URLs externas

## Plano de refatoração em andamento

Ver `docs/superpowers/specs/2026-06-15-auditoria-e-refatoracao-design.md` para o diagnóstico completo.
Os planos de execução estão em `docs/superpowers/plans/`.

Fases planejadas:
- **Fase 1+2** (concluída): Bugs críticos + DX
- **Fase 3** (concluída): Registry de blocos (`blocks/registry.ts`)
- **Fase 4** (concluída): Decomposição do `AdminPageEditorPage` em hooks e sub-componentes
- **Fase 5** (concluída): `BlockErrorBoundary`, remoção de `any` em `pageLayoutHelpers.ts`, custom hooks de React Query (`client/src/hooks/queries/`), extração do `SocialLinksEditor` e `useArticleEditor`, decomposição do `RichTextEditor` em sub-componentes/hooks
- **Fase 6** (concluída): Segurança (auth via httpOnly cookie), migração do `RichTextEditor` de `execCommand` para Tiptap (`client/src/components/RichTextEditor/extensions/`)
