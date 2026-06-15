# Fase 1 + 2 — Correções Imediatas e DX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar bugs críticos de produção, limpar dependências incorretas e estabelecer a infraestrutura de DX (aliases, tipos organizados, CLAUDE.md, README) antes das refatorações estruturais das fases seguintes.

**Architecture:** Mudanças cirúrgicas em arquivos existentes — sem criar novas abstrações, sem mover lógica de negócio. O resultado é um projeto com zero logs de debug em produção, dependências corretas, imports com `@/`, tipos organizados por domínio e documentação real.

**Tech Stack:** React 19, TypeScript (strict), Vite, React Query, Express, Prisma

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `client/src/utils/heroMigration.ts` |
| Modificar | `client/src/pages/AdminPageEditorPage.tsx` |
| Modificar | `client/src/pages/AdminPagesPage.tsx` |
| Modificar | `client/vite.config.ts` |
| Modificar | `package.json` (raiz) |
| Modificar | `client/package.json` |
| Criar | `client/src/assets/image-placeholder.svg` |
| Modificar | `client/src/components/RichTextEditor.tsx` |
| Modificar | `client/tsconfig.app.json` |
| Criar | `client/src/types/blocks.ts` |
| Criar | `client/src/types/layout.ts` |
| Criar | `client/src/types/content.ts` |
| Criar | `client/src/types/auth.ts` |
| Criar | `client/src/types/index.ts` |
| Deletar | `client/src/types.ts` |
| Criar | `CLAUDE.md` |
| Modificar | `README.md` |

---

## Task 1: Remover console.logs de heroMigration.ts

> Bug crítico: `normalizeHeroV2` é chamada a cada render de página com Hero — afeta todos os visitantes do site público.

**Files:**
- Modify: `client/src/utils/heroMigration.ts:304-305,356-357`

- [ ] **Step 1: Remover as 4 linhas de console.log**

Em `client/src/utils/heroMigration.ts`, localizar a função `normalizeHeroV2` e remover as linhas marcadas:

```typescript
// REMOVER as linhas 304-305 (bloco de input logs):
console.log('[normalizeHeroV2] Input rightVariant:', data.rightVariant);
console.log('[normalizeHeroV2] Input right blocks:', data.right.map(b => b.type));

// REMOVER as linhas 356-357 (bloco de output logs):
console.log('[normalizeHeroV2] Output rightVariant:', normalized.rightVariant);
console.log('[normalizeHeroV2] Output right blocks:', normalized.right.map(b => b.type));
```

A função `normalizeHeroV2` deve ficar assim após a remoção (trechos relevantes):

```typescript
function normalizeHeroV2(data: HeroBlockDataV2): HeroBlockDataV2 {
  const normalized = { ...data };
  normalized.layoutVariant = normalizeHeroLayoutVariant(normalized.layoutVariant);

  // (sem console.log aqui)

  if (normalized.layoutVariant === 'stacked') {
    normalized.rightVariant = 'image-only';
  }
  // ... resto da função ...

  // (sem console.log aqui também)

  return normalized;
}
```

- [ ] **Step 2: Verificar que não há outros console.log no arquivo**

```bash
grep -n "console\." client/src/utils/heroMigration.ts
```

Esperado: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/heroMigration.ts
git commit -m "fix: remove debug console.logs de heroMigration (afetava render público)"
```

---

## Task 2: Remover console.logs de AdminPageEditorPage.tsx e AdminPagesPage.tsx

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage.tsx`
- Modify: `client/src/pages/AdminPagesPage.tsx`

- [ ] **Step 1: Remover todos os console.log de AdminPageEditorPage.tsx**

Localizar e remover os seguintes blocos (os números de linha podem variar ligeiramente):

```typescript
// REMOVER — linha ~449
console.log('[LOAD DEBUG] Raw existing page layout:', existingPage.layout);

// REMOVER — linhas ~457-460
console.log('[CLIENT C1] Hero vindo do GET (RAW):');
console.log('  - version:', rawHeroBlock.data?.version);
console.log('  - rightVariant:', rawHeroBlock.data?.rightVariant);
console.log('  - right blocks:', rawHeroBlock.data?.right?.map((b: any) => b.type));

// REMOVER — linha ~465
console.log('[LOAD DEBUG] After ensureLayoutV2:', normalizedLayout);

// REMOVER — linhas ~472-475
console.log('[CLIENT C2] Hero APÓS ensureLayoutV2:');
console.log('  - version:', normHeroBlock.data?.version);
console.log('  - rightVariant:', normHeroBlock.data?.rightVariant);
console.log('  - right blocks:', normHeroBlock.data?.right?.map((b: any) => b.type));

// REMOVER — linhas ~613-617
console.log('[CLIENT A] Hero no payload ANTES do PUT:');
console.log('  - version:', heroData.version);
console.log('  - rightVariant:', heroData.rightVariant);
console.log('  - right blocks:', heroData.right?.map((b: any) => b.type));
console.log('  - Full Hero data:', JSON.stringify(heroData, null, 2));

// REMOVER — linha ~1099
console.log('Go to error:', error);
```

- [ ] **Step 2: Remover todos os console.log de AdminPagesPage.tsx**

```typescript
// REMOVER — linha ~23
console.log('[AdminPagesPage] Query state:', { isLoading, error, isError, pagesCount: pages?.length, pages });

// REMOVER — linhas ~71, 73, 74
console.log('[FRONTEND] Pages recebidas:', pages);
console.log('[FRONTEND] Pages após filtro (removendo home):', filtered);
console.log('[FRONTEND] Pages filtradas:', filtered.map(p => ({ id: p.id, title: p.title, slug: p.slug, pageKey: p.pageKey })));

// REMOVER — linha ~88
console.log('Creating page with data:', pageData);
```

- [ ] **Step 3: Verificar que não há outros console.log nos dois arquivos**

```bash
grep -n "console\." client/src/pages/AdminPageEditorPage.tsx
grep -n "console\." client/src/pages/AdminPagesPage.tsx
```

Esperado: nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AdminPageEditorPage.tsx client/src/pages/AdminPagesPage.tsx
git commit -m "fix: remove debug console.logs do editor e listagem de páginas"
```

---

## Task 3: Corrigir Vite build target

**Files:**
- Modify: `client/vite.config.ts`

- [ ] **Step 1: Atualizar build.target**

Em `client/vite.config.ts`, alterar `target: 'es2015'` para `target: 'es2020'`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
  },
})
```

- [ ] **Step 2: Confirmar que o build compila sem erro**

```bash
cd client && npm run build
```

Esperado: build completa sem erros de sintaxe ou transpilação.

- [ ] **Step 3: Commit**

```bash
git add client/vite.config.ts
git commit -m "fix: alinhar vite build target com tsconfig (es2015 -> es2020)"
```

---

## Task 4: Corrigir dependências incorretas

**Files:**
- Modify: `package.json` (raiz)
- Modify: `client/package.json`

- [ ] **Step 1: Remover `react-image-crop` da raiz**

Em `package.json` (raiz), remover a linha:
```json
"react-image-crop": "^11.0.10"
```

- [ ] **Step 2: Remover `react-image-crop` do cliente**

Em `client/package.json`, remover a linha:
```json
"react-image-crop": "^11.0.10"
```

A biblioteca em uso é `react-easy-crop` — confirmar que ela permanece em `client/package.json`.

- [ ] **Step 3: Consolidar versão do `uuid`**

Em `package.json` (raiz), atualizar:
```json
"uuid": "^13.0.0"
```

Em `client/package.json`, remover a entrada de `uuid` (vai herdar da raiz no install, ou manter explícita — mas na mesma versão).

> Se o projeto não usa workspace hoisting, manter `uuid: "^13.0.0"` em ambos explicitamente. O importante é que ambos apontem para `^13.0.0`.

- [ ] **Step 4: Reinstalar dependências e verificar**

```bash
npm install
```

Esperado: nenhum erro de peer deps. Confirmar que `react-easy-crop` ainda está presente:

```bash
grep "react-easy-crop\|react-image-crop" client/package.json
```

Esperado: apenas `react-easy-crop` aparece.

- [ ] **Step 5: Commit**

```bash
git add package.json client/package.json package-lock.json
git commit -m "fix: remover react-image-crop duplicado e consolidar versão do uuid"
```

---

## Task 5: Substituir via.placeholder.com por asset local

**Files:**
- Create: `client/src/assets/image-placeholder.svg`
- Modify: `client/src/utils/heroMigration.ts`

- [ ] **Step 1: Criar o asset SVG**

Criar o arquivo `client/src/assets/image-placeholder.svg` com o conteúdo:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#f0f0f0"/>
  <rect x="240" y="160" width="120" height="80" rx="4" fill="none" stroke="#ccc" stroke-width="2"/>
  <circle cx="268" cy="185" r="8" fill="#ccc"/>
  <polyline points="240,240 275,205 300,225 330,195 360,240" fill="none" stroke="#ccc" stroke-width="2"/>
  <text x="300" y="290" font-family="sans-serif" font-size="14" fill="#aaa" text-anchor="middle">Adicione uma imagem</text>
</svg>
```

- [ ] **Step 2: Substituir as referências em heroMigration.ts**

Em `client/src/utils/heroMigration.ts`, adicionar o import no topo do arquivo (após os imports existentes):

```typescript
import placeholderSrc from '../assets/image-placeholder.svg';
```

Substituir todas as ocorrências de `'https://via.placeholder.com/600x400?text=Adicione+uma+imagem'` e `'https://via.placeholder.com/600x400'` por `placeholderSrc`:

```typescript
// Linha ~247 — dentro de migrateHeroV1ToV2, fallback de imagem vazia:
data: {
  src: placeholderSrc,
  alt: 'Placeholder',
  size: 100,
  align: 'center',
  heightPct: 100
} as ImageBlockData

// Linha ~330 — dentro de normalizeHeroV2, rightVariant 'image-only' sem imagem:
normalized.right = [{
  id: uuidv4(),
  type: 'image',
  colSpan: 1,
  data: {
    src: placeholderSrc,
    alt: 'Placeholder',
    size: 100,
    heightPct: 100
  } as ImageBlockData
} as PageBlock];

// Linha ~443 — dentro de createDefaultHeroV2:
data: {
  src: placeholderSrc,
  alt: 'Hero image',
  size: 100,
  align: 'center',
  heightPct: 100
} as ImageBlockData
```

- [ ] **Step 3: Verificar que não restam referências externas**

```bash
grep -n "via.placeholder\|placeholder.com" client/src/utils/heroMigration.ts
```

Esperado: nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add client/src/assets/image-placeholder.svg client/src/utils/heroMigration.ts
git commit -m "fix: substituir via.placeholder.com por asset SVG local"
```

---

## Task 6: Substituir window.confirm e window.prompt no RichTextEditor

> `window.confirm` (linha 547) bloqueia a thread para confirmar remoção de imagem.  
> `window.prompt` (linha 762) bloqueia a thread para pedir nome do autor.  
> Ambos serão substituídos por modais React usando `ConfirmModal` e `Modal` de `AdminUI.tsx`.

**Files:**
- Modify: `client/src/components/RichTextEditor.tsx`

- [ ] **Step 1: Adicionar import dos componentes de modal**

No topo de `RichTextEditor.tsx`, adicionar o import:

```typescript
import { ConfirmModal, Modal } from './AdminUI';
```

- [ ] **Step 2: Adicionar estados para os dois modais**

Dentro do componente `RichTextEditor`, após os estados existentes, adicionar:

```typescript
const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);
const [authorModal, setAuthorModal] = useState<{ open: boolean; value: string }>({
  open: false,
  value: '',
});
const authorInputRef = useRef<HTMLInputElement | null>(null);
```

- [ ] **Step 3: Substituir window.confirm em removeImage**

Localizar a função `removeImage` (linha ~544) e substituí-la por duas funções:

```typescript
// Substituir a função removeImage existente por estas duas:
const requestRemoveImage = () => {
  if (!activeFigure) return;
  setImagePopover({ open: false, rect: null, target: null });
  setConfirmRemoveImage(true);
};

const executeRemoveImage = () => {
  if (!activeFigure || !ref.current) return;
  activeFigure.remove();
  highlightFigure(null);
  handleInput();
  setConfirmRemoveImage(false);
};
```

- [ ] **Step 4: Atualizar a chamada de removeImage no imagePopover**

Localizar o botão "Remover imagem" dentro do `imagePopover` (linha ~969) e atualizar o `onClick`:

```tsx
<button
  type="button"
  className="rte-popover-btn tone-danger"
  aria-label="Remover imagem"
  title="Remover imagem"
  onClick={requestRemoveImage}
>
  <FontAwesomeIcon icon={faTrash} />
</button>
```

- [ ] **Step 5: Substituir window.prompt em insertQuoteAuthor**

Localizar a função `insertQuoteAuthor` (linha ~759). Ela começa com:

```typescript
const insertQuoteAuthor = () => {
  const rawAuthor = window.prompt('Nome do autor da frase');
  if (!rawAuthor) return;
  const author = rawAuthor.trim();
  if (!author) return;
  // ... resto da lógica
```

Refatorar para separar a lógica em duas funções:

```typescript
const requestInsertQuoteAuthor = () => {
  captureSelection();
  setAuthorModal({ open: true, value: '' });
};

const applyQuoteAuthor = () => {
  const author = authorModal.value.trim();
  if (!author) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    setAuthorModal({ open: false, value: '' });
    return;
  }
  const block = closestAlignableBlock(sel.getRangeAt(0).startContainer);

  if (block && /^H[1-3]$/.test(block.tagName)) {
    const existing = Array.from(block.children).find((child) => child.classList.contains('rte-author'));
    const authorNode = document.createElement('span');
    authorNode.className = 'rte-author';
    authorNode.setAttribute('data-type', 'quote-author');
    authorNode.textContent = author;
    if (existing) {
      block.replaceChild(authorNode, existing);
    } else {
      block.appendChild(authorNode);
    }
    handleInput();
    setAuthorModal({ open: false, value: '' });
    return;
  }

  if (block && ['P', 'BLOCKQUOTE', 'LI'].includes(block.tagName)) {
    const authorNode = document.createElement('strong');
    authorNode.className = 'rte-author-inline';
    authorNode.setAttribute('data-type', 'quote-author-inline');
    authorNode.textContent = author;
    appendWithSeparator(block, authorNode);
    handleInput();
    setAuthorModal({ open: false, value: '' });
    return;
  }

  const safeAuthor = escapeHtml(author);
  restoreSelection();
  document.execCommand(
    'insertHTML',
    false,
    `<strong class="rte-author-inline" data-type="quote-author-inline">${safeAuthor}</strong>`
  );
  handleInput();
  setAuthorModal({ open: false, value: '' });
};
```

- [ ] **Step 6: Atualizar o botão "Au" na toolbar para usar requestInsertQuoteAuthor**

Localizar no array `toolbarGroups` o item com `key: 'author'` e atualizar o `action`:

```typescript
{
  key: 'author',
  label: <span className="rte-heading-icon">Au</span>,
  title: 'Inserir autor da frase',
  action: requestInsertQuoteAuthor
}
```

- [ ] **Step 7: Adicionar os dois modais no return do componente**

No `return` de `RichTextEditor`, após o modal `editImageModal` e antes do fechamento do `<div className="rte-shell">`:

```tsx
<ConfirmModal
  isOpen={confirmRemoveImage}
  title="Remover imagem"
  description="Tem certeza que deseja remover esta imagem do editor?"
  confirmLabel="Remover"
  cancelLabel="Cancelar"
  onConfirm={executeRemoveImage}
  onClose={() => setConfirmRemoveImage(false)}
/>

<Modal
  isOpen={authorModal.open}
  title="Inserir autor"
  description="O nome será inserido como atribuição após o texto selecionado."
  onClose={() => setAuthorModal({ open: false, value: '' })}
  width={400}
  footer={
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => setAuthorModal({ open: false, value: '' })}
      >
        Cancelar
      </button>
      <button
        className="btn btn-primary"
        type="button"
        onClick={applyQuoteAuthor}
        disabled={!authorModal.value.trim()}
      >
        Inserir
      </button>
    </div>
  }
>
  <input
    ref={authorInputRef}
    className="rte-input"
    style={{ width: '100%' }}
    placeholder="Ex: Carl Jung"
    value={authorModal.value}
    autoFocus
    onChange={(e) => setAuthorModal((prev) => ({ ...prev, value: e.target.value }))}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyQuoteAuthor();
      }
      if (e.key === 'Escape') {
        setAuthorModal({ open: false, value: '' });
      }
    }}
  />
</Modal>
```

- [ ] **Step 8: Verificar que não há mais window.confirm ou window.prompt**

```bash
grep -n "window\.confirm\|window\.prompt" client/src/components/RichTextEditor.tsx
```

Esperado: nenhuma saída.

- [ ] **Step 9: Build para confirmar sem erros de TypeScript**

```bash
cd client && npm run build
```

Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add client/src/components/RichTextEditor.tsx
git commit -m "fix: substituir window.confirm/prompt por modais React no RichTextEditor"
```

---

## Task 7: Configurar path aliases `@/`

**Files:**
- Modify: `client/vite.config.ts`
- Modify: `client/tsconfig.app.json`

- [ ] **Step 1: Adicionar alias no vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
  },
})
```

- [ ] **Step 2: Adicionar paths no tsconfig.app.json**

Localizar `client/tsconfig.app.json` e adicionar `baseUrl` e `paths` dentro de `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

> Adicionar dentro do objeto `compilerOptions` existente, sem substituir as outras opções.

- [ ] **Step 3: Verificar que o TypeScript reconhece o alias**

```bash
cd client && npm run build
```

Esperado: build sem erros. O alias ainda não é usado em nenhum arquivo existente — isso é esperado. Ele estará disponível para os novos arquivos criados a partir desta task.

- [ ] **Step 4: Commit**

```bash
git add client/vite.config.ts client/tsconfig.app.json
git commit -m "feat: configurar path alias @/ para client/src"
```

---

## Task 8: Separar types.ts em types/ por domínio

> Todos os imports existentes como `from '../types'` continuarão funcionando sem alteração porque `types/index.ts` re-exporta tudo e o TypeScript resolve `../types` para `../types/index.ts` automaticamente.

**Files:**
- Create: `client/src/types/blocks.ts`
- Create: `client/src/types/layout.ts`
- Create: `client/src/types/content.ts`
- Create: `client/src/types/auth.ts`
- Create: `client/src/types/index.ts`
- Delete: `client/src/types.ts`

- [ ] **Step 1: Criar `client/src/types/blocks.ts`**

```typescript
export type TextBlockData = {
  contentHtml: string;
  width?: 'normal' | 'wide';
  background?: 'none' | 'soft';
};

export type ImageBlockData = {
  mediaId?: string | null;
  src: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  size?: 25 | 50 | 75 | 100;
  align?: 'left' | 'center' | 'right';
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free';
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number;
  heightPct?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
};

export type ButtonBlockData = {
  label: string;
  href: string;
  newTab?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string | null;
  linkMode?: 'page' | 'manual';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type CardItem = {
  id: string;
  icon?: string | null;
  iconType?: 'emoji' | 'image' | null;
  iconImageUrl?: string | null;
  iconImageId?: string | null;
  iconAlt?: string | null;
  title: string;
  text: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export type CardBlockData = {
  title?: string | null;
  subtitle?: string | null;
  items: CardItem[];
  layout: 'auto' | '2' | '3' | '4';
  variant: 'feature' | 'simple' | 'borderless' | 'earthy';
};

export type FormField = {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
};

export type FormBlockData = {
  title?: string | null;
  description?: string | null;
  fields: FormField[];
  submitLabel?: string;
  successMessage?: string;
  storeSummaryKeys?: string[];
};

export type HeroMediaMode = 'single_image' | 'cards_only' | 'four_cards';

export type HeroImage = {
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
  focal?: { x: number; y: number; zoom: number } | null;
};

export type HeroCard = {
  title: string;
  text: string;
  icon?: string | null;
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
};

export type HeroFourCards = {
  medium: HeroCard;
  small: HeroCard[];
};

export type HeroBlockDataV1 = {
  heading?: string | null;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  secondaryCta?: string | null;
  secondaryHref?: string | null;
  secondaryLinkMode?: 'page' | 'manual' | null;
  secondaryPageKey?: string | null;
  secondaryPageId?: string | null;
  secondarySlug?: string | null;
  badges?: string[] | null;
  mediaMode?: HeroMediaMode | null;
  singleImage?: HeroImage | null;
  singleCard?: { quote?: string | null; author?: string | null } | null;
  fourCards?: HeroFourCards | null;
};

export type PillItem = {
  text: string;
  href?: string | null;
  linkMode?: 'manual' | 'article' | null;
  articleSlug?: string | null;
};

export type PillsBlockData = {
  pills?: (string | PillItem)[];
  items?: string[];
  size?: 'xs' | 'sm' | 'md';
  variant?: 'neutral' | 'primary' | 'accent';
};

export type SpanBlockData = {
  kind: 'accent-bar' | 'muted-text';
  text?: string | null;
};

export type ButtonGroupButton = {
  id?: string;
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  linkMode?: 'manual' | 'page';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type ButtonGroupBlockData = {
  buttons: ButtonGroupButton[];
  align?: 'start' | 'center';
  stackOnMobile?: boolean;
};

export type RecentPostsBlockData = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaLinkMode?: 'page' | 'manual';
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  postsLimit?: number;
};

export type SocialLinksBlockData = {
  title?: string | null;
  variant?: 'list' | 'chips' | 'buttons';
  showIcons?: boolean;
  columns?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
};

export type WhatsAppCtaBlockData = {
  label?: string;
  style?: 'primary' | 'secondary';
  openInNewTab?: boolean;
  hideWhenDisabled?: boolean;
};

export type ServicesBlockItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  linkMode?: 'page' | 'manual';
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
};

export type ServicesBlockData = {
  sectionTitle: string;
  items: ServicesBlockItem[];
  buttonLabel?: string;
};

export type CtaBlockData = {
  title?: string | null;
  text?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type MediaTextBlockData = {
  contentHtml: string;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageWidth?: 25 | 50 | 75 | 100;
  imageHeight?: 25 | 50 | 75 | 100;
  customImageWidthPct?: number | null;
  customImageHeightPct?: number | null;
  customImageWidthPx?: number | null;
  customImageHeightPx?: number | null;
};

export type ContactInfoBlockData = {
  titleHtml: string;
  descriptionHtml?: string;
  whatsappLabel: string;
  whatsappVariant: 'primary' | 'secondary' | 'tertiary';
  socialLinksTitle: string;
  socialLinksVariant: 'list' | 'icons';
};

export type HeroLayoutVariant = 'split' | 'stacked';
export type HeroImageHeight = 'sm' | 'md' | 'lg' | 'xl' | number;

export type HeroBlockDataV2 = {
  version: 2;
  layout: 'two-col';
  layoutVariant?: HeroLayoutVariant;
  imageHeight?: HeroImageHeight | null;
  left: PageBlock[];
  right: PageBlock[];
  rightVariant: 'image-only' | 'cards-only' | 'cards-with-image';
};

export type HeroBlockData = HeroBlockDataV1 | HeroBlockDataV2;

export type PageBlock =
  | { id: string; type: 'text';          colSpan?: number; rowIndex?: number; data: TextBlockData;        isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'image';         colSpan?: number; rowIndex?: number; data: ImageBlockData;       isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'button';        colSpan?: number; rowIndex?: number; data: ButtonBlockData;      isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cards';         colSpan?: number; rowIndex?: number; data: CardBlockData;        isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'form';          colSpan?: number; rowIndex?: number; data: FormBlockData;        isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'hero';          colSpan?: number; rowIndex?: number; data: HeroBlockData;        isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'pills';         colSpan?: number; rowIndex?: number; data: PillsBlockData;       isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'span';          colSpan?: number; rowIndex?: number; data: SpanBlockData;        isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'buttonGroup';   colSpan?: number; rowIndex?: number; data: ButtonGroupBlockData; isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'recent-posts';  colSpan?: number; rowIndex?: number; data: RecentPostsBlockData; isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'social-links';  colSpan?: number; rowIndex?: number; data: SocialLinksBlockData; isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'whatsapp-cta';  colSpan?: number; rowIndex?: number; data: WhatsAppCtaBlockData; isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'contact-info';  colSpan?: number; rowIndex?: number; data: ContactInfoBlockData; isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'services';      colSpan?: number; rowIndex?: number; data: ServicesBlockData;    isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cta';           colSpan?: number; rowIndex?: number; data: CtaBlockData;         isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'media-text';    colSpan?: number; rowIndex?: number; data: MediaTextBlockData;   isLocked?: boolean; visible?: boolean; createdAt?: string; updatedAt?: string };

export type BlockType = PageBlock['type'];
```

- [ ] **Step 2: Criar `client/src/types/layout.ts`**

```typescript
import type { PageBlock } from './blocks';

export type PageStatus = 'draft' | 'published';

export type HomeSection = {
  id: string;
  type: string;
  title?: string | null;
  data: Record<string, unknown>;
  order: number;
  visible: boolean;
  isLocked?: boolean;
};

export type PageLayoutV1 = {
  version: 1;
  columns: 1 | 2 | 3;
  cols: Array<{ id?: string; blocks: PageBlock[] }>;
};

export type PageSection = {
  id: string;
  kind?: 'normal' | 'hero';
  columns: 1 | 2 | 3;
  columnsLayout?: 2 | 3;
  cols: Array<{ id: string; blocks: PageBlock[] }>;
  settings?: {
    background?: 'none' | 'soft' | 'dark' | 'earthy';
    backgroundStyle?: 'none' | 'soft' | 'dark' | 'earthy';
    padding?: 'normal' | 'compact' | 'large';
    density?: 'compact' | 'normal' | 'large';
    height?: 'normal' | 'tall';
    maxWidth?: 'normal' | 'wide';
    width?: 'normal' | 'wide';
    columnsLayout?: 2 | 3;
  };
};

export type PageLayoutV2 = {
  version: 2;
  sections: PageSection[];
};

export type PageLayout = PageLayoutV1 | PageLayoutV2;

export type Page = {
  id: string;
  slug: string;
  pageKey?: string | null;
  title: string;
  description?: string | null;
  layout: PageLayout;
  status: PageStatus;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
```

- [ ] **Step 3: Criar `client/src/types/content.ts`**

```typescript
import type { Media } from './auth';
import type { Page } from './layout';

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt?: string | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  views: number;
  createdAt?: string;
  updatedAt?: string;
  coverMediaId?: string | null;
  coverMedia?: Media | null;
  coverImageUrl?: string | null;
  coverAlt?: string | null;
  coverCrop?: Record<string, unknown> | null;
  coverOriginalUrl?: string | null;
};

export type SiteSettings = {
  siteName: string;
  cnpj?: string | null;
  crp?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  socials: import('./auth').SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
};

export type FormSubmission = {
  id: string;
  pageId: string;
  formBlockId: string;
  data: Record<string, unknown>;
  summary?: Record<string, unknown> | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: Page;
};
```

- [ ] **Step 4: Criar `client/src/types/auth.ts`**

```typescript
export type NavigationItemType = 'INTERNAL_PAGE' | 'EXTERNAL_URL';

export type NavbarItem = {
  id: string;
  label: string;
  type: NavigationItemType;
  pageKey?: string | null;
  url?: string | null;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId?: string | null;
  orderNavbar: number;
  orderFooter?: number | null;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Media = {
  id: string;
  url: string;
  path?: string;
  bucket?: string;
  alt?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free' | null;
};

export type SocialLink = {
  id: string;
  platform:
    | 'instagram'
    | 'whatsapp'
    | 'facebook'
    | 'linkedin'
    | 'youtube'
    | 'tiktok'
    | 'x'
    | 'site'
    | 'email'
    | 'telefone'
    | 'custom';
  label?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
};
```

- [ ] **Step 5: Criar `client/src/types/index.ts`**

```typescript
export type * from './blocks';
export type * from './layout';
export type * from './content';
export type * from './auth';
```

- [ ] **Step 6: Deletar `client/src/types.ts`**

```bash
rm client/src/types.ts
```

- [ ] **Step 7: Verificar que o TypeScript compila sem erros**

```bash
cd client && npm run build
```

Esperado: build sem erros. Se houver erros de "duplicate identifier", significa que algum tipo está exportado em mais de um arquivo — verificar e mover para o arquivo correto.

> **Nota sobre `content.ts`:** O tipo `FormSubmission.data` foi alterado de `Record<string, any>` para `Record<string, unknown>` — mais seguro e correto. Se causar erros de tipagem em componentes que fazem acesso direto a `submission.data.someKey`, esses acessos precisarão de um cast explícito: `(submission.data as Record<string, string>).someKey`.

- [ ] **Step 8: Commit**

```bash
git add client/src/types/ client/src/types.ts
git commit -m "refactor: separar types.ts em types/ por domínio (blocks, layout, content, auth)"
```

---

## Task 9: Criar CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Criar o arquivo**

Criar `CLAUDE.md` na raiz do projeto:

```markdown
# CLAUDE.md — crisjageneski.com.br

Site institucional de psicóloga com CMS próprio baseado em blocos.

## Stack

- **Frontend:** React 19 + Vite + TypeScript strict + React Query + Axios
- **Backend:** Express 5 + TypeScript + Prisma + PostgreSQL
- **Storage:** Supabase (imagens/mídia)
- **Cache:** Redis (opcional, configurável via `REDIS_URL`)
- **Auth:** JWT via localStorage (`cris_token`)

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

# 4. Rodar em desenvolvimento
# Terminal 1 — servidor
cd server && npm run dev

# Terminal 2 — cliente
cd client && npm run dev
```

O cliente roda em http://localhost:5173 e faz proxy de `/api` para o servidor em `localhost:4000`.

## Estrutura do projeto

```
/
├── client/          Frontend React (Vite)
│   └── src/
│       ├── api/         Axios instance + funções de query
│       ├── assets/      Assets estáticos (SVGs, imagens)
│       ├── components/  Componentes React reutilizáveis
│       ├── hooks/       Custom hooks
│       ├── pages/       Páginas (públicas e admin)
│       ├── types/       Tipos TypeScript por domínio
│       └── utils/       Funções utilitárias puras
├── server/          Backend Express (TypeScript)
│   └── src/
│       ├── routes/      Rotas da API
│       ├── middleware/  Auth, rate limit, upload
│       └── services/    Lógica de negócio
├── prisma/          Schema do banco e migrações
└── docs/            Documentação e planos de execução
```

## Sistema de blocos

Páginas são compostas por **seções** → **colunas** → **blocos**. O JSON é salvo no campo `layout` da tabela `Page`.

Os 16 tipos de bloco estão definidos em `client/src/types/blocks.ts` como discriminated union (`PageBlock`).

**Adicionar um novo bloco (após Fase 3 do plano de refatoração):**
1. Criar pasta `client/src/blocks/<nome>/`
2. Criar `renderer.tsx`, `Form.tsx`, `schema.ts` seguindo o padrão dos blocos existentes
3. Adicionar uma linha em `client/src/blocks/registry.ts`
4. Adicionar o novo tipo ao `PageBlock` union em `client/src/types/blocks.ts`

**Adicionar um novo bloco (situação atual, antes da Fase 3):**
1. Adicionar tipo ao discriminated union em `client/src/types/blocks.ts`
2. Adicionar `case` em `PageRenderer.tsx` (switch de renderização)
3. Adicionar `case` em `AdminPageEditorPage.tsx` (switch de formulários)
4. Criar componente de formulário se necessário

## Importações

Use o alias `@/` para imports dentro de `client/src/`:
```typescript
import { Modal } from '@/components/AdminUI';
import type { PageBlock } from '@/types';
```

## Convenções

- TypeScript strict — sem `any` sem motivo explícito
- Componentes em PascalCase, hooks com prefixo `use`
- Funções utilitárias puras em `utils/` (sem efeitos colaterais)
- Sem `console.log` em código de produção
- Sem `window.confirm` ou `window.prompt` — usar modais React (`Modal`, `ConfirmModal` de `AdminUI.tsx`)

## Plano de refatoração em andamento

Ver `docs/superpowers/specs/2026-06-15-auditoria-e-refatoracao-design.md` para o diagnóstico completo.
Os planos de execução estão em `docs/superpowers/plans/`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: criar CLAUDE.md com arquitetura, convenções e como rodar"
```

---

## Task 10: Reescrever README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Substituir o conteúdo do README**

```markdown
# crisjageneski.com.br

Site institucional de psicóloga com CMS próprio baseado em blocos. Permite criar e editar páginas através de um editor visual com seções, colunas e blocos de conteúdo.

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- Conta no Supabase (para storage de imagens)
- Redis (opcional, para cache)

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Preencher no `.env`:
- `DATABASE_URL` — string de conexão PostgreSQL
- `JWT_SECRET` — string aleatória (mín. 16 chars)
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — do painel Supabase
- `SUPABASE_STORAGE_BUCKET` — nome do bucket criado no Supabase

### 2. Instalar dependências

```bash
npm install
cd client && npm install && cd ..
```

### 3. Banco de dados

```bash
npx prisma migrate dev
```

### 4. Criar usuário admin

```bash
ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=suasenha node server/scripts/seed-admin.js
```

## Desenvolvimento

```bash
# Terminal 1 — servidor (porta 4000)
cd server && npm run dev

# Terminal 2 — cliente (porta 5173)
cd client && npm run dev
```

Acesse:
- Site público: http://localhost:5173
- Admin: http://localhost:5173/admin

## Build para produção

```bash
cd client && npm run build
npm start
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Query |
| Backend | Express 5, TypeScript, Prisma |
| Banco | PostgreSQL |
| Storage | Supabase Storage |
| Cache | Redis (opcional) |
| Auth | JWT |

## Documentação

A documentação técnica está em `docs/`. Para detalhes de arquitetura e convenções, ver `CLAUDE.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: reescrever README com setup real do projeto"
```

---

## Auto-revisão do plano

### Cobertura da spec

| Item da spec | Task |
|---|---|
| Bug 2.1 — console.log heroMigration | Task 1 |
| Bug 2.2 — console.log AdminPageEditorPage | Task 2 |
| Bug 2.3 — console.log AdminPagesPage | Task 2 |
| Dep 3.1 — react-image-crop duplicado | Task 4 |
| Dep 3.2 — uuid conflitante | Task 4 |
| Dep 3.3 — vite build target | Task 3 |
| Dep 3.4 — path aliases | Task 7 |
| Bug 2.4 — via.placeholder.com | Task 5 |
| Bug 2.5 — window.confirm/prompt | Task 6 |
| DX 7.1 — CLAUDE.md | Task 9 |
| DX 7.2 — README real | Task 10 |
| DX 7.4 — types/ por domínio | Task 8 |

### Fora deste plano (fases seguintes)

- Sistema de blocos com registry (Fase 3)
- Decomposição de AdminPageEditorPage (Fase 4)
- Error boundary, custom hooks React Query (Fase 5)
- Auth via httpOnly cookie (Fase 6)
