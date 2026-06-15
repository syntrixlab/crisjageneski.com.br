# Auditoria e Plano de Refatoração — crisjageneski.com.br

**Data:** 2026-06-15  
**Escopo:** Frontend (client/), Backend (server/), configurações, dependências  
**Objetivo:** Documentar todos os desvios de boas práticas encontrados, propor correções e estabelecer um plano de execução priorizado.

---

## Índice

1. [Visão geral do projeto](#1-visão-geral-do-projeto)
2. [Bugs críticos](#2-bugs-críticos)
3. [Dependências e configurações](#3-dependências-e-configurações)
4. [Sistema de blocos — redesign](#4-sistema-de-blocos--redesign)
5. [Decomposição de componentes gigantes](#5-decomposição-de-componentes-gigantes)
6. [Qualidade geral do código](#6-qualidade-geral-do-código)
7. [DX, documentação e estrutura de pastas](#7-dx-documentação-e-estrutura-de-pastas)
8. [Prioridades e ordem de execução](#8-prioridades-e-ordem-de-execução)

---

## 1. Visão geral do projeto

Stack:
- **Frontend:** React 19 + Vite + TypeScript (strict) + React Query + Axios
- **Backend:** Express 5 + TypeScript + Prisma + PostgreSQL
- **Storage:** Supabase (imagens/mídia)
- **Cache:** Redis (opcional)
- **Auth:** JWT via localStorage

O projeto é um CMS institucional com editor de páginas baseado em blocos. O usuário admin compõe páginas através de seções com colunas, cada coluna contendo blocos tipados (texto, imagem, hero, cards, etc.). O JSON resultante é salvo no banco e renderizado pelo `PageRenderer` no frontend público.

**Forças existentes:**
- TypeScript strict em todo o projeto
- Discriminated unions bem definidas para os tipos de bloco
- Funções utilitárias puras em `pageLayoutHelpers.ts`
- Sistema de cache TTL configurável
- Separação clara de rotas públicas vs. admin

---

## 2. Bugs críticos

### 2.1 `console.log` em função de render do Hero

**Arquivo:** `client/src/utils/heroMigration.ts`, linhas 304–305 e 356–357  
**Severidade:** 🔴 Crítico  

```typescript
// Dentro de normalizeHeroV2() — chamada a cada render
console.log('[normalizeHeroV2] Input rightVariant:', data.rightVariant);
console.log('[normalizeHeroV2] Input right blocks:', data.right.map(b => b.type));
// ...
console.log('[normalizeHeroV2] Output rightVariant:', normalized.rightVariant);
console.log('[normalizeHeroV2] Output right blocks:', normalized.right.map(b => b.type));
```

**Por que é crítico:** `normalizeHeroV2` é invocada por `normalizeBlocks` → `ensureLayoutV2` → `PageRenderer` a cada renderização. Todo visitante do site público que acessa uma página com bloco Hero dispara esses logs em produção. Além de expor informações internas no console, degrada performance.

**Correção:** Remover as 4 linhas de `console.log`.

---

### 2.2 `console.log` de debug no editor de páginas

**Arquivo:** `client/src/pages/AdminPageEditorPage.tsx`  
**Severidade:** 🔴 Crítico  

Múltiplos logs com prefixos `[LOAD DEBUG]`, `[DEBUG A]` presentes no código de produção. Expõem a estrutura interna do layout e dados de páginas no console do administrador.

**Correção:** Remover todos os `console.log` de debug.

---

### 2.3 `console.log` de debug em páginas admin

**Arquivo:** `client/src/pages/AdminPagesPage.tsx`  
**Severidade:** 🟡 Maior  

Logs de debug ativos. Mesma correção: remover.

---

### 2.4 Placeholder com URL externa (`via.placeholder.com`)

**Arquivo:** `client/src/utils/heroMigration.ts`, linhas 247, 330, 443  
**Severidade:** 🟡 Maior  

```typescript
src: 'https://via.placeholder.com/600x400?text=Adicione+uma+imagem'
```

O serviço `via.placeholder.com` já ficou indisponível no passado. Uma imagem de fallback não deve depender de serviço externo.

**Correção:** Substituir por SVG inline ou asset local em `client/src/assets/placeholder.svg`.

---

### 2.5 `window.confirm()` e `window.prompt()` bloqueantes

**Arquivo:** `client/src/components/RichTextEditor.tsx`, linhas 547 e 762  
**Severidade:** 🟡 Maior  

```typescript
if (!window.confirm('Remover esta imagem?')) return;          // linha 547
const rawAuthor = window.prompt('Nome do autor da frase');    // linha 762
```

Ambos bloqueiam a thread principal, têm aparência inconsistente entre browsers e não podem ser estilizados. O projeto já tem um componente `Modal` em `AdminUI.tsx`.

**Correção:** Substituir por modais React usando `Modal` e `ConfirmModal` de `AdminUI.tsx`.

---

## 3. Dependências e configurações

### 3.1 `react-image-crop` duplicado e em lugar errado

**Severidade:** 🔴 Crítico  

- `react-image-crop@^11.0.10` está em `package.json` da **raiz** (onde não deve estar — a raiz é Node.js/servidor)
- Está também em `client/package.json` (correto)
- `react-easy-crop@^5.5.6` também está em `client/package.json` e é a biblioteca **realmente usada** em `ImageCropModal.tsx` e `FlexibleImageCropModal.tsx`

**Correção:**
1. Remover `react-image-crop` do `package.json` da raiz
2. Remover `react-image-crop` do `client/package.json` (a biblioteca não usada)
3. Manter apenas `react-easy-crop` no cliente

---

### 3.2 Conflito de versão do `uuid`

**Severidade:** 🟡 Maior  

| Local | Versão |
|---|---|
| `package.json` (raiz) | `^11.0.3` |
| `client/package.json` | `^13.0.0` |

**Correção:** Consolidar em `^13.0.0` na raiz e remover do `client/package.json` (deixar herdar do workspace), ou manter versões separadas de forma explícita e documentada.

---

### 3.3 Vite build target incompatível com TypeScript

**Severidade:** 🟡 Maior  

| Configuração | Valor |
|---|---|
| `tsconfig.app.json` → `target` | `ES2022` |
| `vite.config.ts` → `build.target` | `es2015` |

O TypeScript aceita sintaxe ES2022 mas o Vite tenta transpilar para ES2015, criando inconsistência. Features como `structuredClone`, `at()`, `Object.hasOwn()` podem se comportar de forma inesperada.

**Correção:** Atualizar `vite.config.ts`:
```typescript
build: {
  target: 'es2020',  // Alinhado com o mínimo do tsconfig
  minify: 'esbuild',
  sourcemap: false,
}
```

---

### 3.4 Path aliases ausentes — PRIORIDADE ALTA

**Severidade:** 🟠 Médio (impacto alto em DX)  

Nenhum alias configurado. Todos os imports usam caminhos relativos:
```typescript
import { Modal } from '../../components/AdminUI';
import type { PageBlock } from '../../../types';
```

**Correção — `vite.config.ts`:**
```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ...
})
```

**Correção — `tsconfig.app.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 4. Sistema de blocos — redesign

### Problema atual

Adicionar um novo tipo de bloco exige alterações em **5 arquivos diferentes**:

1. `types.ts` — adicionar tipo ao discriminated union
2. `PageRenderer.tsx` — adicionar `case` no switch de 1366 linhas
3. `AdminPageEditorPage.tsx` — adicionar `case` no switch de 4514 linhas
4. Criar componente de formulário (BlockForm)
5. `pageTemplates.ts` ou `sectionPresets.ts` — adicionar ao preset se necessário

Não há um único lugar que defina "o que é um bloco".

### Solução: Registry + Colocation

**Estrutura proposta:**

```
client/src/blocks/
├── registry.ts              ← dicionário central
├── _shared/
│   ├── BlockWrapper.tsx     ← wrapper de layout (padding, background, error boundary)
│   └── types.ts             ← re-exporta BlockConfig, BlockType
├── text/
│   ├── renderer.tsx
│   ├── Form.tsx
│   └── schema.ts            ← tipo + defaultData
├── image/
│   ├── renderer.tsx
│   ├── Form.tsx
│   └── schema.ts
├── button/
├── button-group/
├── cards/
├── cta/
├── form/
├── hero/
├── media-text/
├── pills/
├── recent-posts/
├── services/
├── social-links/
├── span/
├── whatsapp-cta/
└── contact-info/
```

**Contrato do registry (`registry.ts`):**

```typescript
export interface BlockConfig<T = unknown> {
  label: string
  icon: string                                                    // nome ícone FontAwesome
  renderer: React.ComponentType<{ data: T; isAdmin?: boolean }>
  form: React.ComponentType<{ data: T; onChange: (data: T) => void }>
  defaultData: T
}

export const blockRegistry: Record<BlockType, BlockConfig> = {
  text:         { label: 'Texto',          icon: 'font',    renderer: TextRenderer,        form: TextForm,        defaultData: textDefault },
  image:        { label: 'Imagem',         icon: 'image',   renderer: ImageRenderer,       form: ImageForm,       defaultData: imageDefault },
  button:       { label: 'Botão',          icon: 'link',    renderer: ButtonRenderer,      form: ButtonForm,      defaultData: buttonDefault },
  buttonGroup:  { label: 'Grupo de Botões',icon: 'grip',    renderer: ButtonGroupRenderer, form: ButtonGroupForm, defaultData: buttonGroupDefault },
  cards:        { label: 'Cards',          icon: 'th',      renderer: CardsRenderer,       form: CardsForm,       defaultData: cardsDefault },
  cta:          { label: 'CTA',            icon: 'bullhorn', renderer: CtaRenderer,        form: CtaForm,         defaultData: ctaDefault },
  form:         { label: 'Formulário',     icon: 'envelope', renderer: FormRenderer,       form: FormBlockForm,   defaultData: formDefault },
  hero:         { label: 'Hero',           icon: 'star',    renderer: HeroRenderer,        form: HeroForm,        defaultData: heroDefault },
  'media-text': { label: 'Mídia + Texto',  icon: 'columns', renderer: MediaTextRenderer,   form: MediaTextForm,   defaultData: mediaTextDefault },
  pills:        { label: 'Pills',          icon: 'tags',    renderer: PillsRenderer,       form: PillsForm,       defaultData: pillsDefault },
  'recent-posts':{ label: 'Posts Recentes',icon: 'rss',     renderer: RecentPostsRenderer, form: RecentPostsForm, defaultData: recentPostsDefault },
  services:     { label: 'Serviços',       icon: 'list',    renderer: ServicesRenderer,    form: ServicesForm,    defaultData: servicesDefault },
  'social-links':{ label: 'Redes Sociais', icon: 'share',   renderer: SocialLinksRenderer, form: SocialLinksForm, defaultData: socialLinksDefault },
  span:         { label: 'Separador',      icon: 'minus',   renderer: SpanRenderer,        form: SpanForm,        defaultData: spanDefault },
  'whatsapp-cta':{ label: 'WhatsApp CTA',  icon: 'phone',   renderer: WhatsAppCtaRenderer, form: WhatsAppCtaForm, defaultData: whatsAppCtaDefault },
  'contact-info':{ label: 'Info de Contato',icon: 'address-card', renderer: ContactInfoRenderer, form: ContactInfoForm, defaultData: contactInfoDefault },
}
```

**Impacto em `PageRenderer.tsx`:**

```typescript
// Antes: switch com 1366 linhas
// Depois: ~10 linhas
const config = blockRegistry[block.type]
if (!config) return null
const Renderer = config.renderer
return (
  <BlockErrorBoundary>
    <Renderer data={block.data} isAdmin={isAdmin} />
  </BlockErrorBoundary>
)
```

**Adicionar um novo bloco no futuro:**
1. Criar pasta `blocks/meu-bloco/` com `renderer.tsx`, `Form.tsx`, `schema.ts`
2. Adicionar 1 linha no `registry.ts`
3. Adicionar o tipo ao discriminated union em `types/blocks.ts`

### Relação com o banco de dados

O registry **não afeta** o que é salvo no banco. O JSON continua igual:
```json
{ "type": "text", "data": { "contentHtml": "<p>...</p>" } }
```
O registry apenas define *como* esse JSON é renderizado e editado no frontend.

---

## 5. Decomposição de componentes gigantes

### 5.1 `AdminPageEditorPage.tsx` (4514 linhas) — PRIORIDADE ALTA

**Problema:** Um único arquivo que gerencia estado de página, seções, blocos, templates, publicação, validação e UI de edição.

**Decomposição proposta:**

```
pages/AdminPageEditorPage/
├── index.tsx                   ← orquestrador (~200 linhas)
├── hooks/
│   ├── usePageEditor.ts        ← layout, isDirty, save(), discard()
│   ├── useSectionManager.ts    ← addSection(), removeSection(), moveSection()
│   └── useBlockManager.ts      ← addBlock(), removeBlock(), updateBlock(), duplicateBlock()
└── components/
    ├── PageEditorToolbar.tsx   ← salvar, publicar, preview, voltar
    ├── SectionEditor.tsx       ← edição de uma seção (colunas + blocos)
    ├── BlockEditor.tsx         ← painel lateral de edição (usa blockRegistry)
    └── SectionToolbar.tsx      ← botões de ação da seção
```

**Responsabilidade de cada hook:**

| Hook | Estado | Ações |
|---|---|---|
| `usePageEditor` | `layout`, `isDirty`, `isSaving` | `save()`, `discard()`, `setLayout()` |
| `useSectionManager` | — (opera sobre layout) | `addSection()`, `removeSection()`, `moveSection()`, `duplicateSection()` |
| `useBlockManager` | — (opera sobre layout) | `addBlock()`, `removeBlock()`, `updateBlock()`, `moveBlock()`, `duplicateBlock()` |

---

### 5.2 `PageRenderer.tsx` (1366 linhas)

Eliminado pelo registry (Seção 4). Após migração, vira:

```
components/
├── PageRenderer.tsx        ← orquestrador de seções (~150 linhas)
├── PageSection.tsx         ← grid de colunas
└── PageBlock.tsx           ← consulta registry, delega render + error boundary
```

Lógica extraída para hooks:
- `useRecentPosts()` — busca de posts recentes (hoje inline no renderer)
- `useFormSubmit()` — submissão de formulário de contato (hoje inline no renderer)

---

### 5.3 `RichTextEditor.tsx` (1248 linhas)

Complexidade em parte justificável (editor contentEditable é intrinsecamente complexo), mas há extração possível.

**Decomposição:**

```
components/RichTextEditor/
├── index.tsx               ← editor principal + toolbar (~400 linhas)
├── RteImageModal.tsx       ← modal de seleção/upload de imagem
├── RteLinkModal.tsx        ← modal de edição de link
├── RteLightbox.tsx         ← visualização de imagem em tela cheia
├── RteImageEditModal.tsx   ← edição de alt/tamanho/alinhamento de imagem
└── hooks/
    ├── useLinkManager.ts   ← estado de link, popover, edit, remove
    └── useImageManager.ts  ← upload, biblioteca, lightbox, edição
```

**Unificar `positionPopover` e `positionImagePopover`:** as duas funções são idênticas. Extrair como `positionFloating(rect, ref)`.

**Nota sobre `document.execCommand`:** marcado como deprecated mas sem alternativa simples de drop-in. Manter no curto prazo; avaliar migração para Tiptap como projeto separado.

---

### 5.4 `AdminSettingsPage.tsx` (723 linhas)

Razoavelmente coeso (é a página de configurações do site), mas o editor de redes sociais pode virar sub-componente reutilizável:

```
components/SocialLinksEditor.tsx  ← lista de links sociais com add/remove/reorder
```

Isso permite reusar o editor em outros contextos se necessário.

---

### 5.5 `types.ts` (610 linhas) — PRIORIDADE ALTA

**Separação por domínio:**

```
types/
├── index.ts        ← re-exporta tudo (compatibilidade com imports existentes)
├── blocks.ts       ← PageBlock + 16 tipos de BlockData
├── layout.ts       ← PageLayoutV1, PageLayoutV2, PageSection, PageColumn
├── content.ts      ← Article, Media, SiteSettings, FormSubmission, NavbarItem
└── auth.ts         ← User, SocialLink, SocialLinkPlatform
```

O `index.ts` re-exporta tudo para evitar quebrar os ~40 arquivos que importam de `../types`.

---

### 5.6 `AdminArticleEditorPage.tsx` (587 linhas)

Extrair lógica de estado para `useArticleEditor` hook, deixando o componente focado em UI.

---

## 6. Qualidade geral do código

### 6.1 Error Boundary por bloco

Sem `ErrorBoundary`, um dado malformado em qualquer bloco derruba a página inteira (tela branca).

**Solução:**
```typescript
// components/BlockErrorBoundary.tsx
class BlockErrorBoundary extends React.Component<{ children: ReactNode }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return <div className="block-error">Bloco indisponível.</div>
    return this.props.children
  }
}
```

Usado no `PageBlock.tsx` ao redor de cada renderer.

---

### 6.2 Autenticação via `localStorage`

**Situação atual:** Token JWT em `localStorage` como `cris_token`.  
**Risco:** Vulnerável a XSS — qualquer script injetado lê o token.  
**Alternativa:** `httpOnly cookie` configurado pelo servidor.  
**Prioridade:** Médio-baixo para este projeto (site institucional, sem dados de terceiros). Documentar como débito técnico.

---

### 6.3 Uso de `any` em código de produção

| Arquivo | Linha | Contexto |
|---|---|---|
| `pageLayoutHelpers.ts` | 9 | `(block as any).rowIndex` |
| `pageLayoutHelpers.ts` | 103 | `(section.settings as any)?.columnsLayout` |
| `heroMigration.ts` | 19, 37 | `data: any` em type guards |
| `sectionPresets.ts` | 538 | `regenerateBlockIds(block: any)` |

**Correção:** Tipar corretamente usando os tipos existentes ou criando tipos intermediários.

---

### 6.4 React Query sem custom hooks

Queries definidas como funções async em `queries.ts` e chamadas manualmente com `useQuery`. Lógica de invalidação duplicada em vários componentes.

**Proposta:**
```typescript
// hooks/usePages.ts
export function usePages() {
  return useQuery({ queryKey: ['pages'], queryFn: fetchAdminPages })
}

export function usePublishPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: publishPage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] })
  })
}
```

---

### 6.5 `document.execCommand` deprecated

Usado extensivamente no `RichTextEditor.tsx` para bold, italic, listas, headings. Deprecated em todos os browsers modernos mas sem quebra iminente. Registrar como débito técnico; migrar para Tiptap é um projeto separado.

---

## 7. DX, documentação e estrutura de pastas

### 7.1 CLAUDE.md — PRIORIDADE ALTA

Criar arquivo `CLAUDE.md` na raiz do projeto documentando:
- Arquitetura geral (client/server, como os blocos funcionam)
- Como rodar o projeto (`npm run dev`, variáveis necessárias)
- Como adicionar um novo bloco (após o registry estar implementado)
- Convenções de código (naming, estrutura de pastas)
- Onde cada coisa está

---

### 7.2 README.md real — PRIORIDADE ALTA

Substituir o README genérico do Vite por um documento real com:
- Descrição do projeto
- Pré-requisitos
- Setup (`.env`, banco, Supabase)
- Comandos de desenvolvimento e build
- Estrutura de pastas de alto nível

---

### 7.3 Path aliases — PRIORIDADE ALTA

Já detalhado em 3.4.

---

### 7.4 Estrutura de pastas final — PRIORIDADE ALTA

```
client/src/
├── blocks/                  ← NOVO: registry + componentes por tipo de bloco
│   ├── registry.ts
│   ├── _shared/
│   └── [16 pastas de bloco]/
├── components/              ← componentes de UI genéricos e reutilizáveis
│   ├── PageRenderer.tsx     (simplificado após registry)
│   ├── PageSection.tsx      (NOVO, extraído do PageRenderer)
│   ├── PageBlock.tsx        (NOVO, extraído do PageRenderer)
│   ├── BlockErrorBoundary.tsx (NOVO)
│   ├── RichTextEditor/      (NOVO: pasta com sub-componentes)
│   └── ...
├── hooks/                   ← hooks reutilizáveis
│   ├── usePageValidation.ts
│   ├── useRecentPosts.ts    (NOVO)
│   ├── useFormSubmit.ts     (NOVO)
│   └── [custom query hooks]
├── pages/
│   ├── AdminPageEditorPage/ (NOVO: pasta com hooks e sub-componentes)
│   └── ...
├── types/                   ← NOVO: separado por domínio
│   ├── index.ts             (re-exporta tudo)
│   ├── blocks.ts
│   ├── layout.ts
│   ├── content.ts
│   └── auth.ts
├── api/
├── utils/
└── main.tsx
```

---

### 7.5 Cobertura de testes

Atualmente existe apenas `blockGridHelpers.test.ts`. Expandir cobertura para:
- `pageLayoutHelpers.ts` — funções puras, fáceis de testar
- `heroMigration.ts` — migração V1→V2 com casos de borda
- `blockRegistry` — validar que todos os blocos têm `renderer`, `form` e `defaultData`

---

## 8. Prioridades e ordem de execução

### Fase 1 — Correções imediatas (sem refatoração estrutural)

| # | Item | Arquivo(s) | Esforço |
|---|---|---|---|
| 1.1 | Remover `console.log` do `heroMigration.ts` | `heroMigration.ts` | 5 min |
| 1.2 | Remover `console.log` do `AdminPageEditorPage.tsx` | `AdminPageEditorPage.tsx` | 10 min |
| 1.3 | Remover `console.log` do `AdminPagesPage.tsx` | `AdminPagesPage.tsx` | 5 min |
| 1.4 | Corrigir `build.target` no Vite | `vite.config.ts` | 5 min |
| 1.5 | Remover `react-image-crop` (raiz + cliente) | `package.json`, `client/package.json` | 10 min |
| 1.6 | Consolidar versão do `uuid` | `package.json`, `client/package.json` | 10 min |
| 1.7 | Substituir `via.placeholder.com` por asset local | `heroMigration.ts`, `sectionPresets.ts` | 20 min |
| 1.8 | Substituir `window.confirm/prompt` por modais React | `RichTextEditor.tsx` | 1h |

---

### Fase 2 — DX e documentação (PRIORIDADE ALTA — fazer antes da refatoração)

| # | Item | Arquivo(s) | Esforço |
|---|---|---|---|
| 2.1 | Criar `CLAUDE.md` | `/CLAUDE.md` | 1h |
| 2.2 | Reescrever `README.md` | `/README.md` | 1h |
| 2.3 | Configurar path aliases `@/` | `vite.config.ts`, `tsconfig.app.json` | 20 min |
| 2.4 | Separar `types.ts` em `types/` | `types/` | 2h |

---

### Fase 3 — Sistema de blocos (registry)

| # | Item | Esforço estimado |
|---|---|---|
| 3.1 | Criar estrutura de pastas `blocks/` | 30 min |
| 3.2 | Criar `BlockConfig` interface e `registry.ts` | 1h |
| 3.3 | Criar `schema.ts` para cada um dos 16 blocos | 3h |
| 3.4 | Extrair renderers do `PageRenderer.tsx` para `blocks/*/renderer.tsx` | 4h |
| 3.5 | Extrair forms do `AdminPageEditorPage.tsx` para `blocks/*/Form.tsx` | 4h |
| 3.6 | Simplificar `PageRenderer.tsx` usando registry | 2h |
| 3.7 | Criar `BlockErrorBoundary` e envolver cada render | 1h |
| 3.8 | Extrair `useRecentPosts` e `useFormSubmit` do `PageRenderer` | 1h |

---

### Fase 4 — Decomposição do editor de páginas

| # | Item | Esforço estimado |
|---|---|---|
| 4.1 | Extrair `usePageEditor` hook | 2h |
| 4.2 | Extrair `useSectionManager` hook | 2h |
| 4.3 | Extrair `useBlockManager` hook | 2h |
| 4.4 | Criar `PageEditorToolbar`, `SectionEditor`, `BlockEditor` | 3h |
| 4.5 | Reduzir `AdminPageEditorPage.tsx` para orquestrador | 2h |

---

### Fase 5 — Qualidade de código

| # | Item | Esforço estimado |
|---|---|---|
| 5.1 | Criar `BlockErrorBoundary` (feito na Fase 3.7) | — |
| 5.2 | Remover `as any` de `pageLayoutHelpers.ts` e `heroMigration.ts` | 1h |
| 5.3 | Criar custom hooks React Query (`usePages`, `usePosts`, etc.) | 2h |
| 5.4 | Extrair `SocialLinksEditor` de `AdminSettingsPage` | 1h |
| 5.5 | Extrair `useArticleEditor` de `AdminArticleEditorPage` | 2h |
| 5.6 | Decompor `RichTextEditor` em sub-componentes e hooks | 4h |

---

### Fase 6 — Segurança e débitos técnicos de longo prazo

| # | Item | Prioridade |
|---|---|---|
| 6.1 | Migrar auth de `localStorage` para `httpOnly cookie` | Baixa |
| 6.2 | Migrar `RichTextEditor` de `execCommand` para Tiptap | Baixa (projeto separado) |
| 6.3 | Expandir cobertura de testes | Média |

---

## Resumo de impacto por fase

| Fase | Objetivo | Resultado esperado |
|---|---|---|
| 1 | Corrigir bugs e dependências | Sem logs em produção, deps limpas |
| 2 | DX e documentação | Qualquer sessão começa com contexto claro |
| 3 | Registry de blocos | Novo bloco = 1 pasta + 1 linha no registry |
| 4 | Decomposição do editor | Editor de páginas legível e manutenível |
| 5 | Qualidade geral | TypeScript sem `any`, sem globals bloqueantes |
| 6 | Segurança e futuro | Dívidas técnicas documentadas e priorizadas |
