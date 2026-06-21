# Especificação — Redesign do Sistema de Blocos

**Data:** 2026-06-19  
**Status:** Proposta — aguardando aprovação  
**Relacionado:** `2026-06-19-page-builder-redesign.md` (Fase 7)  
**Escopo:** `client/src/blocks/`, `client/src/types/blocks.ts`, `client/src/blocks/registry.ts`

---

## Objetivo

Tornar cada bloco maximamente configurável via admin, sem necessidade de alterações de código para adaptar o CMS a diferentes clientes. O guia é: **se está visível na página, deve ser editável no painel.**

---

## 0. Regra arquitetural — "Migração na borda, formato canônico único"

### 0.1 O problema atual

O bloco `hero` tem dois tipos de dado históricos (`HeroBlockDataV1` e `HeroBlockDataV2`) que vazam por todo o codebase:

- `types/blocks.ts` exporta `HeroBlockDataV1`, `HeroBlockDataV2` **e** `HeroBlockData = V1 | V2`
- `heroMigration.ts` exporta `isHeroV1`, `isHeroV2` usados por renderer, Form e BlockEditorModal
- O renderer tem dois caminhos de renderização condicionados por `isHeroV1(data)`
- O `Form.tsx` do hero tem guards `if (isHeroV1(data))` que bifurcam a lógica
- `BlockEditorModal.tsx` tem fallback hardcoded `heroV1FallbackFourCards` para validação de V1

Resultado: cada novo campo no bloco precisa ser implementado duas vezes (uma para cada versão). Qualquer desenvolvedor que toque no bloco precisa entender as duas estruturas. Difícil de manter, impossível de escalar para outros blocos que evoluam.

### 0.2 A regra

> **Renderer, Form e qualquer componente de UI só podem ver o formato canônico do bloco. Migração de formatos antigos acontece exclusivamente na borda de entrada dos dados, uma única vez.**

"Borda de entrada" significa: dentro de `ensureLayoutV2`, que já é chamado ao carregar e ao salvar qualquer página.

### 0.3 Padrão de implementação (para o hero e para todos os blocos futuros)

```
Dado salvo no banco (qualquer formato histórico)
         │
         ▼
  ensureLayoutV2()          ← borda de entrada
         │
  normalizeBlocks()         ← itera cada bloco
         │
  normalizeBlock(block)     ← por tipo
         │
  migrateHeroToCanonical()  ← converte qualquer versão → canônico
         │
         ▼
  HeroBlockData             ← único tipo, único caminho
  (formato canônico)
         │
    ┌────┴────┐
    ▼         ▼
renderer    Form            ← só veem o canônico; sem guards de versão
```

**Regras derivadas:**

1. Cada bloco tem **um único tipo de dado exportado** (`HeroBlockData`, não `HeroBlockDataV1 | HeroBlockDataV2`). Tipos de versões anteriores são privados ao arquivo de migração.

2. A função de migração (`normalize<Tipo>`) deve ser **idempotente** — rodar sobre dado já canônico retorna o mesmo dado sem alterações.

3. Renderer e Form **nunca importam** `heroMigration.ts`. Só `ensureLayoutV2` importa.

4. Quando um campo novo é adicionado a um bloco, o tipo canônico recebe o campo como opcional com default explícito. A função de migração garante que dados antigos (sem o campo) recebam o default ao serem normalizados.

5. Se um bloco futuro precisar de um campo renomeado ou reestruturado, o padrão é: adicionar o mapeamento em `normalizeBlock`, manter o campo antigo como `@deprecated` no tipo por **uma release**, depois remover.

### 0.4 Execução para o hero (Fase 8-H — precede todas as outras fases)

**8-H1 — Definir tipo canônico `HeroBlockData`**
- O tipo canônico é `HeroBlockDataV2` atual, renomeado para `HeroBlockData` (sem sufixo)
- Adicionar ao tipo canônico os campos faltantes que hoje estão só no V1 (ex: `badges` → já migrado como `pills`, `heading` → já migrado como bloco `text`)
- `HeroBlockDataV1` vira tipo privado em `heroMigration.ts` (remove export de `types/blocks.ts`)
- `HeroBlockDataV2` deixa de existir como tipo separado

**8-H2 — Tornar `migrateHeroV1ToV2` a única migração**
- Renomear para `normalizeHero(data: unknown): HeroBlockData`
- A função aceita `unknown` e retorna sempre o canônico:
  - Se `data` for formato V1 → executa a migração existente → retorna canônico
  - Se `data` já for canônico → valida/completa campos opcionais → retorna canônico
  - Se `data` for inválido → retorna `heroDefault` (safe fallback)
- Remover `isHeroV1`, `isHeroV2` como exports públicos (manter internamente se necessário)

**8-H3 — Limpar renderer do hero**
- Remover todos os `if (isHeroV1(data))` / `isHeroV2(data)` 
- Renderizar diretamente a partir do tipo canônico
- Remover import de `heroMigration`

**8-H4 — Limpar Form do hero**
- Remover toda lógica condicional baseada em `isHeroV1`
- Form só opera sobre `HeroBlockData` canônico

**8-H5 — Limpar BlockEditorModal**
- Remover `heroV1FallbackFourCards` e a validação de V1
- A validação do hero passa a ser simples (campos do canônico)

**8-H6 — Atualizar `normalizeBlocks` em `heroMigration.ts`**
- Chamar `normalizeHero(block.data)` para qualquer bloco `type === 'hero'`
- Remover `normalizeHeroV2` (absorvido pelo `normalizeHero`)
- `console.log` que existiam em `normalizeHeroV2` (bugs críticos da auditoria anterior) eliminados aqui

**Arquivos impactados pela Fase 8-H:**
`types/blocks.ts`, `utils/heroMigration.ts`, `blocks/hero/renderer.tsx`, `blocks/hero/Form.tsx`, `blocks/hero/schema.ts`, `pages/AdminPageEditorPage/components/BlockEditorModal.tsx`

### 0.5 Aplicação para outros blocos no futuro

O mesmo padrão se aplica quando qualquer outro bloco evoluir. A checklist é:

```
□ Definir o novo tipo canônico (campos adicionais como optional)
□ Criar normalize<Bloco>(data: unknown): <Bloco>BlockData em um arquivo normalize<Bloco>.ts
□ Registrar em normalizeBlocks() em heroMigration.ts (renomear para normalizeBlocks.ts na Fase 8-H)
□ Atualizar renderer e Form para usar apenas o tipo canônico
□ Nenhum guard de versão fora do arquivo de normalização
```

O arquivo `heroMigration.ts` será renomeado para `normalizeBlocks.ts` para refletir sua função geral, não específica do hero.

---

## 1. Sistema de tokens compartilhados (novo)

Antes de tratar bloco por bloco, precisamos de um vocabulário comum de configuração que se aplica a qualquer bloco. A proposta é um tipo opcional `BlockStyle` que pode ser adicionado ao dado de qualquer bloco, e um conjunto de CSS custom properties que os renderers consumem.

### 1.1 Tipo `BlockStyle`

```typescript
// client/src/types/blocks.ts — adicionar

export type TextAlign = 'left' | 'center' | 'right';
export type FontSize  = 'sm' | 'md' | 'lg' | 'xl';         // 0.9 / 1 / 1.2 / 1.5 rem base
export type SpacingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg'; // 0 / 0.25 / 0.5 / 1 / 2 rem
export type ColorToken = 'default' | 'muted' | 'primary' | 'accent' | 'inverse';
export type RadiusToken = 'none' | 'sm' | 'md' | 'lg' | 'full';

export type BlockStyle = {
  align?:       TextAlign;       // alinhamento de texto
  paddingTop?:  SpacingToken;
  paddingBottom?: SpacingToken;
  color?:       ColorToken;      // cor do texto (usa CSS var)
  radius?:      RadiusToken;     // border-radius de imagens/cards
};
```

**Princípio:** sem hex livre. O admin escolhe entre tokens que mapeiam para CSS custom properties do tema. Isso garante consistência visual independente de quem edita.

### 1.2 Como usar nos blocos

Cada bloco que aceitar `BlockStyle` terá `style?: BlockStyle` no seu schema e o renderer aplicará:

```tsx
// util: blockStyleToCSS(style?: BlockStyle): React.CSSProperties
// Converte tokens → valores CSS concretos usando var() do tema
```

O `Form.tsx` do bloco exibe seção colapsável "Estilo avançado" com os controles relevantes para aquele bloco.

---

## 2. Bugs a corrigir antes de adicionar features

Estes são bugs objetivos identificados na auditoria — sem eles, adicionar features em cima é construir sobre base quebrada.

| # | Bloco | Bug | Correção |
|---|-------|-----|----------|
| B1 | `image` | `caption` salvo no Form mas nunca renderizado | Adicionar `<figcaption>` condicional no renderer |
| B2 | `hero` V1 | Textos institucionais hardcoded: "Atendimento online e presencial" e "Sigilo e confidencialidade garantidos" | Adicionar `badges?: string[]` editável; manter padrão com os dois textos |
| B3 | `hero` V1 | Botão principal sempre com `target="_blank"` ignorando `ctaLinkMode` | Corrigir lógica no renderer para respeitar `ctaLinkMode` |
| B4 | `button-group` | Variante `ghost` no Form não tem classe CSS correspondente no renderer | Criar `.btn-ghost` no App.css ou remover a opção do Form |
| B5 | `button-group` | `target` calculado por `linkMode`, não por `newTab` | Adicionar campo `newTab: boolean` por botão no schema |
| B6 | `contact-info` | Variante `tertiary` não tem classe CSS distinta (cai em `btn-outline`) | Criar `.btn-tertiary` com estilo próprio ou remover do Form |
| B7 | `social-links` | Título renderizado com `<h3 style={{ marginBottom: '1rem' }}>` hardcoded | Mover para classe CSS |
| B8 | `services` | Ícone fixo `/assets/brand/spiral.png` — não substituível | Tornar configurável (ver Fase 8-B) |
| B9 | `whatsapp-cta` | Loading state com hexadecimais inline (`#d1d5db`) | Mover para classes CSS / var() |
| B10 | `recent-posts` | Skeleton com dimensões pixel fixas inline | Mover para classes CSS |
| B11 | `cards` | Seta `→` hardcoded no CTA do card | Tornar opcional via campo `ctaShowArrow?: boolean` |

---

## 3. Novos campos por bloco

### 3.1 `text`

**Novos campos:**
- `align?: 'left' | 'center' | 'right'` — alinhamento do texto (padrão: `left`)
- `fontSize?: 'sm' | 'md' | 'lg' | 'xl'` — escala base do conteúdo
- `maxWidth?: 'narrow' | 'normal' | 'wide' | 'full'` — substituir o atual `width: 'normal'|'wide'` com mais granularidade

**Form:** controles de alinhamento com ícones (≡◉≡ estilo word processor) e seletor de tamanho.  
**Renderer:** aplicar via classe `page-text--align-{align}`, `page-text--size-{fontSize}`.

---

### 3.2 `image`

**Novos campos:**
- `caption?: string` — (já existe, mas nunca renderizado — fix B1)
- `link?: string` — ao clicar na imagem navega para este URL
- `linkNewTab?: boolean`
- `radius?: RadiusToken` — borda arredondada da imagem
- `shadow?: 'none' | 'sm' | 'md' | 'lg'` — sombra

**Form:** seção "Link da imagem" com `LinkPicker`; seção "Estilo" com radius e shadow.  
**Renderer:** envolver `<img>` em `<a>` quando `link` presente; aplicar classes `img-radius-{radius}`, `img-shadow-{shadow}`.

---

### 3.3 `button`

**Novos campos:**
- `align?: 'left' | 'center' | 'right'` — alinhamento do wrapper (padrão: `left`)
- `size?: 'sm' | 'md' | 'lg'` — tamanho do botão
- `fullWidth?: boolean` — botão ocupa 100% da largura

**Form:** segmented control de alinhamento + seletor de tamanho.  
**Renderer:** `.page-public-button-wrapper` recebe `data-align`, botão recebe `btn-sm`/`btn-lg`.

---

### 3.4 `button-group`

**Correções:** fix B4 (ghost), fix B5 (newTab por botão).

**Novos campos:**
- `align?: 'start' | 'center' | 'end'` — adicionar `end`
- `gap?: 'sm' | 'md' | 'lg'` — espaço entre botões
- Por botão: `size?: 'sm' | 'md' | 'lg'`, `fullWidth?: boolean`

---

### 3.5 `cards`

**Correções:** fix B11 (seta opcional).

**Novos campos:**
- `ctaShowArrow?: boolean` — exibir seta `→` no CTA (padrão: `true`)
- `imageRatio?: '1:1' | '4:3' | '16:9' | 'free'` — proporção das imagens nos cards
- `cardRadius?: RadiusToken` — bordas dos cards
- `cardShadow?: 'none' | 'sm' | 'md'`
- `columnsDesktop?: 2 | 3 | 4` — separar do `layout: 'auto'|'2'|'3'|'4'` existente (ou unificar)
- `columnsMobile?: 1 | 2` — controle de colunas em mobile

**Form:** seção colapsável "Aparência dos cards".

---

### 3.6 `cta`

**Novos campos:**
- `layout?: 'default' | 'image-left' | 'image-right' | 'image-bg'` — posicionamento da imagem
- `align?: 'left' | 'center' | 'right'` — alinhamento do texto
- `secondaryCtaLabel?: string` — botão secundário (opcional)
- `secondaryCtaHref?: string`
- `secondaryCtaVariant?: 'secondary' | 'ghost'`
- `imageDimRatio?: 'natural' | '1:1' | '4:3'` — aspect ratio da imagem
- `imageRadius?: RadiusToken`
- `overlayOpacity?: number` — para `layout: 'image-bg'`, opacidade do overlay escuro (0–0.8)

**Form:** seletor de layout com preview em miniatura ASCII; seção de botão secundário colapsável.

---

### 3.7 `form`

**Novos campos:**
- `submitVariant?: 'primary' | 'secondary' | 'ghost'` — variante do botão de envio
- `submitAlign?: 'left' | 'center' | 'right' | 'full'`
- `columnLayout?: 1 | 2` — campos em 1 ou 2 colunas
- `successAction?: 'message' | 'redirect'`
- `successRedirectUrl?: string` — usado quando `successAction === 'redirect'`
- `errorMessage?: string` — mensagem de erro personalizável (hoje é string hardcoded)

**Form:** seção "Comportamento" com `successAction`; seção "Aparência" com `submitVariant` e `submitAlign`.

---

### 3.8 `hero` (V2)

**Correções:** fix B2 e B3 (no V1).

**Novos campos para V2:**
- `minHeight?: 'auto' | 'half-screen' | 'full-screen'` — altura mínima da seção hero
- `imageObjectFit?: 'cover' | 'contain' | 'natural'` — hoje está `cover` hardcoded
- `imageRadius?: RadiusToken` — bordas da imagem (hoje sem borda)
- `gap?: 'sm' | 'md' | 'lg'` — espaço entre coluna esquerda e direita
- Para bloco `text` dentro do hero-left: os campos do `text` normal (align, fontSize)

---

### 3.9 `media-text`

**Novos campos:**
- `verticalAlign?: 'top' | 'center' | 'bottom'` — alinhamento vertical do texto em relação à imagem
- `imageRadius?: RadiusToken`
- `imageShadow?: 'none' | 'sm' | 'md' | 'lg'`
- `caption?: string` — legenda abaixo da imagem
- `gap?: 'sm' | 'md' | 'lg'` — espaço entre imagem e texto

---

### 3.10 `pills`

**Novos campos:**
- `gap?: 'sm' | 'md' | 'lg'` — espaço entre pills
- `icon?: string` — prefixo emoji/ícone para todas as pills (ex: `"✓"` para checklists)
- `align?: 'left' | 'center' | 'right'`
- `border?: 'solid' | 'dashed' | 'none'` — estilo da borda

---

### 3.11 `recent-posts`

**Correções:** fix B10 (skeleton).

**Novos campos:**
- `displayLayout?: 'grid' | 'list'` — grade de cards vs lista vertical
- `showImage?: boolean` — exibir imagem de capa nos cards (padrão: `true`)
- `showDate?: boolean` — exibir data de publicação
- `showExcerpt?: boolean` — exibir trecho do artigo
- `ctaVariant?: 'primary' | 'secondary' | 'ghost'` — variante do botão "Ver todos"
- `cardRadius?: RadiusToken`

---

### 3.12 `services`

**Correções:** fix B8 (ícone configurável).

**Novos campos:**
- `icon?: { type: 'image' | 'emoji' | 'none'; src?: string; emoji?: string }` — substituir o spiral hardcoded; `src` usa `ImagePickerModal`
- `maxItems?: 4 | 6 | 8` — limite de itens (hoje fixo em 4)
- `ctaVariant?: 'primary' | 'secondary' | 'outline'`
- `layout?: 'grid' | 'list'`

---

### 3.13 `social-links`

**Correções:** fix B7 (título inline).

**Novos campos:**
- Por rede social: `customDescription?: string` — substituir o fallback hardcoded de cada plataforma
- `showLabels?: boolean` — em variante `chips`, exibir label ao lado do ícone
- `gap?: 'sm' | 'md' | 'lg'`
- `iconSize?: 'sm' | 'md' | 'lg'`

**Obs:** as descrições hardcoded de plataforma (`"Reflexões e conteúdo semanal"`, etc.) devem vir de `SiteSettings.socials[].description` (campo já existente ou a adicionar), não do renderer.

---

### 3.14 `span`

**Novos campos:**
- `color?: ColorToken` — para `accent-bar`, permite usar cor `primary` ou `accent` do tema
- `thickness?: 'thin' | 'normal' | 'thick'` — espessura da barra
- `width?: 'short' | 'medium' | 'full'` — largura da barra
- Novo `kind`: `'divider'` — linha horizontal simples (substitui a barra de destaque decorativa)

---

### 3.15 `whatsapp-cta`

**Correções:** fix B9 (loading state).

**Novos campos:**
- `size?: 'sm' | 'md' | 'lg'`
- `fullWidth?: boolean`
- `showIcon?: boolean` — exibir ícone do WhatsApp (padrão: `true`)
- `align?: 'left' | 'center' | 'right'`

---

### 3.16 `contact-info`

**Correções:** fix B6 (tertiary variant).

**Novos campos:**
- `layout?: 'vertical' | 'horizontal'` — modo horizontal: WhatsApp e redes lado a lado
- `showWhatsapp?: boolean` — ocultar botão WhatsApp (ex: negócios sem WA)
- `showSocials?: boolean` — ocultar seção de redes
- `showIcons?: boolean` — controle de ícones nas redes (equivalente ao do `social-links`)
- `spacing?: 'compact' | 'normal' | 'relaxed'` — espaço entre os elementos

---

## 4. Novos blocos propostos

Blocos que não existem hoje mas aumentam o alcance do CMS para outros clientes:

### 4.1 `testimonials` — Depoimentos

```typescript
type TestimonialsBlockData = {
  title?: string;
  items: {
    quote: string;
    author: string;
    role?: string;
    avatarUrl?: string;
  }[];
  layout: 'grid' | 'carousel' | 'single';
  variant: 'card' | 'quote' | 'minimal';
};
```

### 4.2 `faq` — Perguntas frequentes (accordion)

```typescript
type FaqBlockData = {
  title?: string;
  items: { question: string; answerHtml: string }[];
  variant: 'simple' | 'bordered' | 'filled';
  allowMultipleOpen: boolean;
};
```

### 4.3 `video` — Embed de vídeo

```typescript
type VideoBlockData = {
  url: string;          // YouTube ou Vimeo URL
  title?: string;
  caption?: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
};
```

### 4.4 `gallery` — Galeria de imagens

```typescript
type GalleryBlockData = {
  images: { src: string; alt: string; caption?: string }[];
  columns: 2 | 3 | 4;
  gap: 'sm' | 'md' | 'lg';
  imageRatio: '1:1' | '4:3' | '16:9' | 'free';
  lightbox: boolean;    // abrir imagem em modal ao clicar
};
```

### 4.5 `pricing` — Tabela de preços

```typescript
type PricingBlockData = {
  title?: string;
  subtitle?: string;
  items: {
    name: string;
    price: string;          // string livre: "R$ 200", "A partir de R$ 150/mês"
    description?: string;
    features: string[];
    ctaLabel?: string;
    ctaHref?: string;
    highlighted?: boolean;  // destaque visual
  }[];
  layout: 'cards' | 'table';
};
```

### 4.6 `stats` — Números em destaque

```typescript
type StatsBlockData = {
  title?: string;
  items: {
    value: string;    // "10+", "98%", "500"
    label: string;    // "anos de experiência"
    icon?: string;    // emoji
  }[];
  columns: 2 | 3 | 4;
  variant: 'minimal' | 'card' | 'large';
};
```

### 4.7 `team` — Equipe / perfil profissional

```typescript
type TeamBlockData = {
  title?: string;
  members: {
    name: string;
    role: string;
    bio?: string;
    avatarUrl?: string;
    socials?: { platform: string; url: string }[];
  }[];
  layout: 'grid' | 'list';
  imageRatio: '1:1' | '3:4';
  imageRadius: RadiusToken;
};
```

---

## 5. Plano de execução — Fase 8

> **Ordem obrigatória:** 8-H → 8-A → 8-B → 8-C → 8-D → 8-E → 8-F → 8-G  
> A Fase 8-H é pré-requisito de todas as outras porque limpa a dívida de V1/V2 que contamina o codebase.

### Fase 8-H — Formato canônico único (pré-requisito) `[Codex]`

Ver seção 0.4 para subtarefas detalhadas (8-H1 a 8-H6).  
Renomear `heroMigration.ts` → `normalizeBlocks.ts` ao final desta fase.

### Fase 8-A — Bugfixes dos blocos `[Haiku]`

Correções objetivas sem mudança de schema (só renderer ou remoção de hardcode).

- **8-A1:** Renderizar `caption` no bloco `image` (fix B1)
- **8-A2:** Corrigir `target` no hero V1 (fix B3) e `button-group` (fix B5)
- **8-A3:** Criar `.btn-ghost` e `.btn-tertiary` no CSS (fix B4, B6)
- **8-A4:** Mover estilos inline hardcoded para classes CSS: `social-links`, `whatsapp-cta`, `recent-posts` (fix B7, B9, B10)
- **8-A5:** Tornar `→` do cards opcional com padrão `true` (fix B11)

### Fase 8-B — Tipos compartilhados e infraestrutura `[Codex]`

Fundação que as fases seguintes dependem.

- **8-B1:** Adicionar `BlockStyle`, `TextAlign`, `SpacingToken`, `ColorToken`, `RadiusToken` em `types/blocks.ts`
- **8-B2:** Criar `client/src/utils/blockStyleToCSS.ts` — converte `BlockStyle` → `React.CSSProperties` + classes CSS
- **8-B3:** Adicionar CSS variables para os tokens (em `App.css` ou `index.css`):
  ```css
  --block-radius-sm: 8px; --block-radius-md: 16px; --block-radius-lg: 24px; --block-radius-full: 9999px;
  --spacing-xs: 0.25rem; --spacing-sm: 0.5rem; --spacing-md: 1rem; --spacing-lg: 2rem;
  ```
- **8-B4:** Criar componente `BlockStyleControls` reutilizável para Forms (align, radius, shadow, spacing)

### Fase 8-C — Blocos de conteúdo básico `[Haiku]`

`text`, `image`, `button`, `button-group`, `pills`, `span`

Por bloco:
1. Adicionar novos campos ao tipo em `types/blocks.ts`
2. Atualizar `schema.ts` (defaults)
3. Atualizar `Form.tsx` com os novos controles
4. Atualizar `renderer.tsx` para consumir os novos campos
5. Manter backward compat: todos os novos campos são opcionais com fallback nos defaults atuais

### Fase 8-D — Blocos compostos `[Codex]`

`cards`, `cta`, `media-text`, `services`, `social-links`, `contact-info`

Mesma sequência 1–5 por bloco. Mais complexo por envolver múltiplos sub-itens e novos layouts.

### Fase 8-E — Hero e Form `[Codex]`

Mais complexos — tratamento especial:
- `hero`: editar textos hardcoded V1, novos campos V2
- `form`: lógica de redirect pós-envio (mudança no backend também: `POST /api/forms/submit` deve retornar `redirectUrl` se configurado)

### Fase 8-F — Novos blocos `[Codex]`

Ordem recomendada por valor/esforço:
1. `testimonials` (alto valor, baixo esforço)
2. `faq` (alto valor, médio esforço — accordion)
3. `stats` (alto valor, baixo esforço)
4. `video` (médio valor, baixo esforço — só embed URL)
5. `gallery` (médio valor, médio esforço — lightbox)
6. `pricing` (médio valor, médio esforço)
7. `team` (baixo valor para esse cliente, médio esforço)

### Fase 8-G — Revisão e QA `[Haiku]`

- Testar cada bloco: criar, editar, salvar, abrir, verificar que dados antigos (sem os novos campos) ainda renderizam corretamente (backward compat)
- Verificar que `ensureLayoutV2` não corrompe nenhum bloco ao normalizar
- Snapshot visual dos blocos antes/depois (screenshot via webapp-testing skill)

---

## 6. Arquivos impactados

| Fase | Arquivos |
|------|---------|
| 8-H | `types/blocks.ts`, `utils/heroMigration.ts` → renomear para `utils/normalizeBlocks.ts`, `blocks/hero/renderer.tsx`, `blocks/hero/Form.tsx`, `blocks/hero/schema.ts`, `pages/AdminPageEditorPage/components/BlockEditorModal.tsx` |
| 8-A | `blocks/image/renderer.tsx`, `blocks/cards/renderer.tsx`, `blocks/button-group/renderer.tsx`, `App.css` |
| 8-B | `types/blocks.ts`, `utils/blockStyleToCSS.ts` (novo), `App.css`/`index.css`, `blocks/_shared/BlockStyleControls.tsx` (novo) |
| 8-C | `blocks/text/*`, `blocks/image/*`, `blocks/button/*`, `blocks/button-group/*`, `blocks/pills/*`, `blocks/span/*` |
| 8-D | `blocks/cards/*`, `blocks/cta/*`, `blocks/media-text/*`, `blocks/services/*`, `blocks/social-links/*`, `blocks/contact-info/*` |
| 8-E | `blocks/hero/*`, `blocks/form/*`, `server/src/routes/forms.ts` |
| 8-F | `blocks/testimonials/*` (novo), `blocks/faq/*` (novo), `blocks/stats/*` (novo), `blocks/video/*` (novo), `blocks/gallery/*` (novo), `blocks/pricing/*` (novo), `blocks/team/*` (novo), `blocks/registry.ts`, `types/blocks.ts` |
| 8-G | testes e screenshots |

---

## 7. Regras de backward compatibility

Todos os novos campos devem ser **opcionais** com fallback explícito no renderer:

```tsx
// Exemplo no renderer do button:
const align = data.align ?? 'left';        // novo campo, default seguro
const size  = data.size  ?? 'md';         // novo campo, default seguro
```

`ensureLayoutV2` não precisa ser alterado — campos opcionais ausentes simplesmente usam o default no momento da renderização. Isso garante que dados salvos antes da atualização continuam funcionando.

---

## 8. Critérios de aceitação por fase

- **8-A:** todos os 11 bugs listados corrigidos; nenhum dado existente corrompido
- **8-B:** tipos compilam sem erro em strict mode; `blockStyleToCSS` tem cobertura de todos os tokens
- **8-C/D/E:** cada bloco modificado tem: (a) novos campos opcionais no schema, (b) Form.tsx com controles novos, (c) renderer consumindo os campos, (d) default backward-compat
- **8-F:** cada bloco novo tem: schema, Form, renderer, registro em `registry.ts`, preset em `sectionPresets.ts` (opcional)
- **8-G:** nenhuma página existente quebra ao abrir no editor após a Fase 8-F
