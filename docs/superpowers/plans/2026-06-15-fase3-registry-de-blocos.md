# Fase 3: Registry de Blocos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um registry central de blocos para que adicionar um novo bloco exija apenas 3 arquivos (`renderer.tsx`, `Form.tsx`, `schema.ts`) e 1 linha no `registry.ts`.

**Architecture:** Cada bloco vive em `client/src/blocks/<nome>/` com três arquivos de responsabilidade única. O `registry.ts` importa todos os 16 blocos e exporta um único objeto `blockRegistry`. `PageRenderer.tsx` e `AdminPageEditorPage.tsx` delegam para o registry em vez de switch gigantes. A comunicação recursiva do bloco `hero` (que renderiza outros blocos internamente) é feita via render prop `renderChild` para evitar dependência circular.

**Tech Stack:** React 19, TypeScript strict, `@/` alias (configurado na Fase 1+2), FontAwesome, React Query, Vite

---

## Mapeamento de arquivos

**Criar:**
- `client/src/blocks/_shared/types.ts` — `BlockConfig`, `BlockFormProps`, `BlockRendererProps`
- `client/src/blocks/registry.ts` — mapa `BlockType → BlockConfig`
- `client/src/components/BlockErrorBoundary.tsx` — error boundary por bloco
- `client/src/blocks/<nome>/schema.ts` × 16 — tipo + `defaultData`
- `client/src/blocks/<nome>/renderer.tsx` × 16 — componente de renderização pública
- `client/src/blocks/<nome>/Form.tsx` × 16 — formulário de edição admin

**Modificar:**
- `client/src/components/PageRenderer.tsx` — `PageBlockView` passa de switch 520 linhas para ~15 linhas
- `client/src/pages/AdminPageEditorPage.tsx` — painéis de formulário (16 condicionais × 2 = ~200 linhas) viram ~20 linhas; `labelMap` inline vira lookup no registry; funções de form (linhas 1951–4473) são removidas

**Mover:**
- `client/src/components/RecentPostsBlockForm.tsx` → `client/src/blocks/recent-posts/Form.tsx`
- `client/src/components/ServicesBlockForm.tsx` → `client/src/blocks/services/Form.tsx`
- `client/src/components/ContactInfoBlockForm.tsx` → `client/src/blocks/contact-info/Form.tsx`

---

## Task 1: Scaffold + interface `BlockConfig`

**Files:**
- Create: `client/src/blocks/_shared/types.ts`
- Create: `client/src/blocks/registry.ts` (vazio, apenas tipo)

- [ ] **Step 1: Criar `_shared/types.ts`**

```typescript
// client/src/blocks/_shared/types.ts
import type React from 'react';
import type { PageBlock } from '@/types';

export interface BlockFormProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export interface BlockRendererProps<T = unknown> {
  data: T;
  pageSlug?: string;
  enableFormSubmit?: boolean;
  // Render prop para renderização recursiva (hero renderiza blocos filhos).
  // Evita dependência circular: hero/renderer → registry → hero/renderer.
  renderChild?: (block: PageBlock) => React.ReactNode;
}

export interface BlockConfig<T = unknown> {
  label: string;
  defaultData: T;
  renderer: React.ComponentType<BlockRendererProps<T>>;
  form: React.ComponentType<BlockFormProps<T>>;
}
```

- [ ] **Step 2: Criar `registry.ts` com stub vazio**

```typescript
// client/src/blocks/registry.ts
import type { BlockType } from '@/types';
import type { BlockConfig } from './_shared/types';

// Preenchido na Task 16. Por enquanto evita erros de import.
export const blockRegistry = {} as Record<BlockType, BlockConfig>;
```

- [ ] **Step 3: Verificar build**

```bash
cd client && npm run build
```

Expected: build sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add client/src/blocks/
git commit -m "feat(blocks): scaffold registry + BlockConfig interface"
```

---

## Task 2: Schemas para os 16 blocos

Cada `schema.ts` exporta o tipo de dados e o `defaultData` do bloco. Não contém lógica.

**Files:**
- Create: `client/src/blocks/text/schema.ts`
- Create: `client/src/blocks/image/schema.ts`
- Create: `client/src/blocks/button/schema.ts`
- Create: `client/src/blocks/span/schema.ts`
- Create: `client/src/blocks/pills/schema.ts`
- Create: `client/src/blocks/button-group/schema.ts`
- Create: `client/src/blocks/cta/schema.ts`
- Create: `client/src/blocks/media-text/schema.ts`
- Create: `client/src/blocks/cards/schema.ts`
- Create: `client/src/blocks/form/schema.ts`
- Create: `client/src/blocks/hero/schema.ts`
- Create: `client/src/blocks/recent-posts/schema.ts`
- Create: `client/src/blocks/social-links/schema.ts`
- Create: `client/src/blocks/whatsapp-cta/schema.ts`
- Create: `client/src/blocks/contact-info/schema.ts`
- Create: `client/src/blocks/services/schema.ts`

- [ ] **Step 1: Criar schemas para blocos simples**

```typescript
// client/src/blocks/text/schema.ts
export type { TextBlockData } from '@/types';
import type { TextBlockData } from '@/types';
export const textDefault: TextBlockData = { contentHtml: '', width: 'normal', background: 'none' };
```

```typescript
// client/src/blocks/image/schema.ts
export type { ImageBlockData } from '@/types';
import type { ImageBlockData } from '@/types';
export const imageDefault: ImageBlockData = { src: '', alt: null, size: 100, align: 'center' };
```

```typescript
// client/src/blocks/button/schema.ts
export type { ButtonBlockData } from '@/types';
import type { ButtonBlockData } from '@/types';
export const buttonDefault: ButtonBlockData = { label: 'Saiba mais', href: '', variant: 'primary', newTab: false };
```

```typescript
// client/src/blocks/span/schema.ts
export type { SpanBlockData } from '@/types';
import type { SpanBlockData } from '@/types';
export const spanDefault: SpanBlockData = { kind: 'accent-bar' };
```

```typescript
// client/src/blocks/pills/schema.ts
export type { PillsBlockData } from '@/types';
import type { PillsBlockData } from '@/types';
export const pillsDefault: PillsBlockData = { pills: [], size: 'sm', variant: 'neutral' };
```

```typescript
// client/src/blocks/button-group/schema.ts
export type { ButtonGroupBlockData } from '@/types';
import type { ButtonGroupBlockData } from '@/types';
export const buttonGroupDefault: ButtonGroupBlockData = {
  buttons: [
    { label: 'Agendar sessão', href: '/contato', variant: 'primary', linkMode: 'manual' },
    { label: 'Saiba mais', href: '/sobre', variant: 'secondary', linkMode: 'manual' }
  ],
  align: 'start',
  stackOnMobile: true
};
```

```typescript
// client/src/blocks/cta/schema.ts
export type { CtaBlockData } from '@/types';
import type { CtaBlockData } from '@/types';
export const ctaDefault: CtaBlockData = {
  title: 'Vamos conversar?',
  text: 'Agende uma conversa inicial gratuita.',
  ctaLabel: 'Agendar',
  ctaHref: '/contato',
  ctaLinkMode: 'manual'
};
```

```typescript
// client/src/blocks/media-text/schema.ts
export type { MediaTextBlockData } from '@/types';
import type { MediaTextBlockData } from '@/types';
export const mediaTextDefault: MediaTextBlockData = {
  contentHtml: '<p>Texto ao lado da imagem.</p>',
  imageUrl: null,
  imageAlt: null,
  imageSide: 'left',
  imageWidth: 50
};
```

- [ ] **Step 2: Criar schemas para blocos de lista/formulário**

```typescript
// client/src/blocks/cards/schema.ts
export type { CardBlockData, CardItem } from '@/types';
import type { CardBlockData } from '@/types';
export const cardsDefault: CardBlockData = {
  title: null,
  subtitle: null,
  items: [],
  layout: 'auto',
  variant: 'feature'
};
```

```typescript
// client/src/blocks/form/schema.ts
export type { FormBlockData, FormField } from '@/types';
import type { FormBlockData } from '@/types';
export const formDefault: FormBlockData = {
  title: 'Entre em contato',
  description: null,
  fields: [],
  submitLabel: 'Enviar',
  successMessage: 'Mensagem enviada com sucesso!'
};
```

```typescript
// client/src/blocks/recent-posts/schema.ts
export type { RecentPostsBlockData } from '@/types';
import type { RecentPostsBlockData } from '@/types';
export const recentPostsDefault: RecentPostsBlockData = {
  title: 'Conteúdos recentes',
  subtitle: 'Leituras curtas para acompanhar você entre as sessões.',
  ctaLabel: 'Ver todos os artigos',
  ctaHref: '/blog',
  postsLimit: 3
};
```

```typescript
// client/src/blocks/social-links/schema.ts
export type { SocialLinksBlockData } from '@/types';
import type { SocialLinksBlockData } from '@/types';
export const socialLinksDefault: SocialLinksBlockData = {
  title: null,
  variant: 'list',
  showIcons: true,
  columns: 1,
  align: 'left'
};
```

```typescript
// client/src/blocks/whatsapp-cta/schema.ts
export type { WhatsAppCtaBlockData } from '@/types';
import type { WhatsAppCtaBlockData } from '@/types';
export const whatsAppCtaDefault: WhatsAppCtaBlockData = {
  label: 'Fale conosco no WhatsApp',
  style: 'primary',
  openInNewTab: true,
  hideWhenDisabled: true
};
```

```typescript
// client/src/blocks/contact-info/schema.ts
export type { ContactInfoBlockData } from '@/types';
import type { ContactInfoBlockData } from '@/types';
export const contactInfoDefault: ContactInfoBlockData = {
  titleHtml: '<h2>Vamos conversar?</h2>',
  whatsappLabel: 'Enviar mensagem no WhatsApp',
  whatsappVariant: 'primary',
  socialLinksTitle: 'Redes sociais',
  socialLinksVariant: 'list'
};
```

```typescript
// client/src/blocks/services/schema.ts
export type { ServicesBlockData, ServicesBlockItem } from '@/types';
import type { ServicesBlockData } from '@/types';
export const servicesDefault: ServicesBlockData = {
  sectionTitle: 'Serviços',
  items: [],
  buttonLabel: 'Saiba mais'
};
```

- [ ] **Step 3: Criar schema do hero**

```typescript
// client/src/blocks/hero/schema.ts
export type { HeroBlockData, HeroBlockDataV2, HeroBlockDataV1, HeroMediaMode, HeroImage, HeroCard, HeroFourCards, HeroLayoutVariant, HeroImageHeight } from '@/types';
import type { HeroBlockData } from '@/types';
// Hero V2 é o padrão atual — V1 é legado (sem defaultData novo)
export const heroDefault: HeroBlockData = {
  version: 2,
  layout: 'two-col',
  layoutVariant: 'split',
  imageHeight: 'lg',
  rightVariant: 'image-only',
  left: [],
  right: []
};
```

- [ ] **Step 4: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/
git commit -m "feat(blocks): schemas com defaultData para os 16 blocos"
```

---

## Task 3: `BlockErrorBoundary`

**Files:**
- Create: `client/src/components/BlockErrorBoundary.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// client/src/components/BlockErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

type State = { hasError: boolean };

export class BlockErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', border: '1px dashed #f87171', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem' }}>
          Bloco indisponível.
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/BlockErrorBoundary.tsx
git commit -m "feat(blocks): BlockErrorBoundary para isolamento de erros por bloco"
```

---

## Task 4: Renderers — text, image, button, span, pills, buttonGroup

Extrair o código de renderização de `PageRenderer.tsx` para cada pasta de bloco.

**Files:**
- Create: `client/src/blocks/text/renderer.tsx`
- Create: `client/src/blocks/image/renderer.tsx`
- Create: `client/src/blocks/button/renderer.tsx`
- Create: `client/src/blocks/span/renderer.tsx`
- Create: `client/src/blocks/pills/renderer.tsx`
- Create: `client/src/blocks/button-group/renderer.tsx`

- [ ] **Step 1: `text/renderer.tsx`**

Conteúdo da branch `case 'text'` em `PageRenderer.tsx` linhas 274–282:

```tsx
// client/src/blocks/text/renderer.tsx
import { RichText } from '@/components/RichText';
import type { BlockRendererProps } from '../_shared/types';
import type { TextBlockData } from './schema';

export function TextRenderer({ data }: BlockRendererProps<TextBlockData>) {
  const widthClass = data.width === 'wide' ? 'page-text--wide' : '';
  const backgroundClass = data.background === 'soft' ? 'page-text--soft' : '';
  return (
    <div className={`page-public-text ${widthClass} ${backgroundClass}`.trim()}>
      <RichText html={data.contentHtml || ''} />
    </div>
  );
}
```

- [ ] **Step 2: `image/renderer.tsx`**

Conteúdo da branch `case 'image'` em `PageRenderer.tsx` linhas 283–328:

```tsx
// client/src/blocks/image/renderer.tsx
import { getBlockImageCropStyles } from '@/utils/imageCrop';
import type { BlockRendererProps } from '../_shared/types';
import type { ImageBlockData } from './schema';

export function ImageRenderer({ data }: BlockRendererProps<ImageBlockData>) {
  const size = data.size ?? 100;
  const align = data.align ?? 'center';
  const hasCrop = ['cropX', 'cropY', 'cropWidth', 'cropHeight'].every(
    (key) => (data as Record<string, unknown>)[key] !== null && (data as Record<string, unknown>)[key] !== undefined
  );
  const cropStyles = hasCrop
    ? getBlockImageCropStyles(
        data.naturalWidth ?? undefined,
        data.naturalHeight ?? undefined,
        data.cropX,
        data.cropY,
        data.cropWidth,
        data.cropHeight
      )
    : {};
  const cropRatioClass =
    data.cropRatio === '16:9' ? 'page-public-image--crop-16-9'
    : data.cropRatio === '9:16' ? 'page-public-image--crop-9-16'
    : data.cropRatio === '1:1' ? 'page-public-image--crop-1-1'
    : data.cropRatio === '4:3' ? 'page-public-image--crop-4-3'
    : '';
  const cropClasses = hasCrop ? ['page-public-image--cropped', cropRatioClass].filter(Boolean).join(' ') : '';
  const figureClass = `page-public-image rte-image--size-${size} rte-image--align-${align} ${cropClasses}`.trim();

  return (
    <figure className={figureClass}>
      <img src={data.src} alt={data.alt ?? ''} loading="lazy" style={cropStyles} />
    </figure>
  );
}
```

- [ ] **Step 3: `button/renderer.tsx`**

Conteúdo da branch `case 'button'` em `PageRenderer.tsx` linhas 329–346:

```tsx
// client/src/blocks/button/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { ButtonBlockData } from './schema';

export function ButtonRenderer({ data }: BlockRendererProps<ButtonBlockData>) {
  const variant = data.variant ?? 'primary';
  const classes = variant === 'secondary' ? 'btn btn-outline' : variant === 'ghost' ? 'btn btn-ghost' : 'btn btn-primary';
  return (
    <div className="page-public-button-wrapper">
      <a
        className={`page-public-button ${classes}`.trim()}
        href={data.href || '#'}
        target={data.newTab ? '_blank' : undefined}
        rel={data.newTab ? 'noreferrer' : undefined}
      >
        {data.icon && <span className="page-button-icon">{data.icon}</span>}
        <span>{data.label}</span>
      </a>
    </div>
  );
}
```

- [ ] **Step 4: `span/renderer.tsx`**

Conteúdo da branch `case 'span'` em `PageRenderer.tsx` linhas 738–746:

```tsx
// client/src/blocks/span/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { SpanBlockData } from './schema';

export function SpanRenderer({ data }: BlockRendererProps<SpanBlockData>) {
  if (data.kind === 'accent-bar') return <span className="hero-accent-bar" aria-hidden="true" />;
  if (data.kind === 'muted-text') return <span className="muted">{data.text || ''}</span>;
  return null;
}
```

- [ ] **Step 5: `pills/renderer.tsx`**

Conteúdo da branch `case 'pills'` em `PageRenderer.tsx` linhas 701–737:

```tsx
// client/src/blocks/pills/renderer.tsx
import type { PillItem } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { PillsBlockData } from './schema';

export function PillsRenderer({ data }: BlockRendererProps<PillsBlockData>) {
  const rawPills = data.pills ?? data.items ?? [];
  const sizeClass = data.size ? `pills--${data.size}` : '';
  const variantClass = data.variant ? `pills--${data.variant}` : '';

  return (
    <div className={`pills-row ${sizeClass} ${variantClass}`.trim()}>
      {rawPills.map((pill: string | PillItem, idx: number) => {
        const pillData = typeof pill === 'string'
          ? { text: pill, href: null, linkMode: null, articleSlug: null }
          : pill;
        const href = pillData.linkMode === 'article' && pillData.articleSlug
          ? `/blog/${pillData.articleSlug}`
          : pillData.href;
        if (href) {
          return <a key={idx} href={href} className="pill pill--link">{pillData.text}</a>;
        }
        return <span key={idx} className="pill">{pillData.text}</span>;
      })}
    </div>
  );
}
```

- [ ] **Step 6: `button-group/renderer.tsx`**

Conteúdo da branch `case 'buttonGroup'` em `PageRenderer.tsx` linhas 747–773:

```tsx
// client/src/blocks/button-group/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { ButtonGroupBlockData } from './schema';

export function ButtonGroupRenderer({ data }: BlockRendererProps<ButtonGroupBlockData>) {
  const buttons = data.buttons ?? [];
  const align = data.align ?? 'start';
  const stackOnMobile = data.stackOnMobile ?? true;
  const alignClass = align === 'center' ? 'hero-actions--center' : 'hero-actions--start';
  const stackClass = stackOnMobile ? 'hero-actions--stack' : '';

  return (
    <div className={`hero-actions ${alignClass} ${stackClass}`.trim()}>
      {buttons.map((btn, idx) => {
        const variant = btn.variant ?? 'primary';
        const classes = variant === 'secondary' ? 'btn btn-outline' : 'btn btn-primary';
        return (
          <a
            key={idx}
            className={classes}
            href={btn.href || '#'}
            target={btn.linkMode === 'page' ? undefined : '_blank'}
            rel={btn.linkMode === 'page' ? undefined : 'noreferrer'}
          >
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add client/src/blocks/
git commit -m "feat(blocks): renderers para text, image, button, span, pills, buttonGroup"
```

---

## Task 5: Renderers — cta, media-text, cards, services

**Files:**
- Create: `client/src/blocks/cta/renderer.tsx`
- Create: `client/src/blocks/media-text/renderer.tsx`
- Create: `client/src/blocks/cards/renderer.tsx`
- Create: `client/src/blocks/services/renderer.tsx`

- [ ] **Step 1: `cta/renderer.tsx`**

Conteúdo da branch `case 'cta'` em `PageRenderer.tsx` linhas 347–377:

```tsx
// client/src/blocks/cta/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { CtaBlockData } from './schema';

export function CtaRenderer({ data }: BlockRendererProps<CtaBlockData>) {
  const title = data.title ?? 'Vamos conversar?';
  const text = data.text ?? 'Agende uma conversa inicial para entender o melhor plano.';
  const ctaLabel = data.ctaLabel ?? 'Agendar';
  const ctaHref = data.ctaHref ?? '/contato';
  const imageUrl = data.imageUrl ?? null;
  const imageAlt = data.imageAlt ?? '';
  const openInNewTab = data.ctaLinkMode === 'manual' && /^https?:\/\//i.test(ctaHref);

  return (
    <div className={`cta-block ${imageUrl ? 'cta-block--with-media' : 'cta-block--no-media'}`.trim()}>
      <div className="cta-content">
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <div className="cta-actions">
          <a className="btn btn-primary" href={ctaHref} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined}>
            {ctaLabel}
          </a>
        </div>
      </div>
      {imageUrl && (
        <div className="cta-media" aria-hidden="true">
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `media-text/renderer.tsx`**

Conteúdo da branch `case 'media-text'` em `PageRenderer.tsx` linhas 378–412:

```tsx
// client/src/blocks/media-text/renderer.tsx
import { RichText } from '@/components/RichText';
import type { BlockRendererProps } from '../_shared/types';
import type { MediaTextBlockData } from './schema';

export function MediaTextRenderer({ data }: BlockRendererProps<MediaTextBlockData>) {
  const side = data.imageSide === 'right' ? 'right' : 'left';
  const rawWidth = (data as Record<string, unknown>).imageWidth ?? (data as Record<string, unknown>).imageWidthPct ?? 50;
  const rawCustomWidthPct = Number((data as Record<string, unknown>).customImageWidthPct);
  const rawCustomWidth = Number((data as Record<string, unknown>).customImageWidthPx);
  const widthPreset: 25 | 50 | 75 | 100 = [25, 50, 75, 100].includes(Number(rawWidth))
    ? (Number(rawWidth) as 25 | 50 | 75 | 100)
    : 50;
  const customWidthPct = Number.isFinite(rawCustomWidthPct) && rawCustomWidthPct > 0
    ? Math.max(1, Math.min(Math.round(rawCustomWidthPct), 100))
    : null;
  const customWidthPx = Number.isFinite(rawCustomWidth) && rawCustomWidth > 0
    ? Math.max(120, Math.min(Math.round(rawCustomWidth), 2000))
    : null;
  const resolvedImageWidth = customWidthPct ? `${customWidthPct}%` : customWidthPx ? `${customWidthPx}px` : `${widthPreset}%`;

  return (
    <div
      className={`page-media-text page-media-text--${side}`}
      style={{ ['--media-text-image-width' as string]: resolvedImageWidth }}
    >
      <figure className="page-media-text-image">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.imageAlt ?? ''} loading="lazy" />
        ) : (
          <div className="page-media-text-placeholder">Sem imagem</div>
        )}
      </figure>
      <div className="page-media-text-content">
        <RichText html={data.contentHtml || ''} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `cards/renderer.tsx`**

Conteúdo da branch `case 'cards'` em `PageRenderer.tsx` linhas 413–447:

```tsx
// client/src/blocks/cards/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { CardBlockData } from './schema';

export function CardsRenderer({ data }: BlockRendererProps<CardBlockData>) {
  const layout = data.layout ?? 'auto';
  const variant = data.variant ?? 'feature';
  const layoutClass = layout === 'auto' ? 'cards-layout--auto' : `cards-layout--${layout}`;
  const variantClass = `cards-variant--${variant}`;

  return (
    <div className="page-public-cards">
      {data.title && <h2 className="cards-title">{data.title}</h2>}
      {data.subtitle && <p className="cards-subtitle">{data.subtitle}</p>}
      <div className={`cards-grid ${layoutClass} ${variantClass}`.trim()}>
        {data.items.map((card) => (
          <div key={card.id} className="card-item">
            {(card.icon || card.iconImageUrl) && (
              <div className="card-icon">
                {((card.iconType === 'image' || (!card.iconType && card.iconImageUrl)) && card.iconImageUrl) ? (
                  <img className="card-icon-img" src={card.iconImageUrl} alt={card.iconAlt ?? ''} loading="lazy" />
                ) : (
                  <span className="card-icon-emoji" aria-hidden="true">{card.icon}</span>
                )}
              </div>
            )}
            <h3 className="card-title">{card.title}</h3>
            <p className="card-text">{card.text}</p>
            {card.ctaLabel && card.ctaHref && (
              <a href={card.ctaHref} className="card-cta">{card.ctaLabel} →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `services/renderer.tsx`**

Conteúdo da função `ServicesRenderer` em `PageRenderer.tsx` linhas 966–995:

```tsx
// client/src/blocks/services/renderer.tsx
import type { BlockRendererProps } from '../_shared/types';
import type { ServicesBlockData } from './schema';

export function ServicesRenderer({ data }: BlockRendererProps<ServicesBlockData>) {
  const sectionTitle = (data.sectionTitle ?? 'Serviços').toString().trim() || 'Serviços';
  const buttonLabel = (data.buttonLabel ?? 'Saiba mais').toString().trim() || 'Saiba mais';
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="services-section">
      <div className="services-header">
        <h2>{sectionTitle}</h2>
        <span className="services-accent" aria-hidden="true" />
      </div>
      <div className="services-grid">
        {items.map((item) => (
          <div key={item.id} className="service-card">
            <div className="service-icon" aria-hidden="true">
              <img src="/assets/brand/spiral.png" alt="" />
            </div>
            <h3 className="service-card__title">{item.title}</h3>
            {item.description && <p className="service-description">{item.description}</p>}
            <a className="btn btn-outline services-cta" href={item.href || '#'}>{buttonLabel}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add client/src/blocks/
git commit -m "feat(blocks): renderers para cta, media-text, cards, services"
```

---

## Task 6: Renderer — form (com lógica de submissão)

**Files:**
- Create: `client/src/blocks/form/renderer.tsx`

- [ ] **Step 1: Criar `form/renderer.tsx`**

Copiar a função `FormRenderer` de `PageRenderer.tsx` linhas 997–1227 e a função auxiliar `resolvePageSlugFromLocation` (linhas 1220–1227), ajustando imports:

```tsx
// client/src/blocks/form/renderer.tsx
import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { submitForm } from '@/api/queries';
import type { BlockRendererProps } from '../_shared/types';
import type { FormBlockData } from './schema';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

function resolvePageSlugFromLocation(): string {
  const path = window.location.pathname;
  if (path === '/' || path === '/home') return 'home';
  const match = path.match(/^\/p\/([^/]+)/);
  if (match) return match[1];
  const parts = path.split('/').filter(Boolean);
  return parts[0] || 'home';
}
```

Após os imports/helpers, copiar o corpo completo da função `FormRenderer` de `PageRenderer.tsx` (linhas 1000–1218), substituindo a assinatura por:

```tsx
export function FormRenderer({ data: formData, enableFormSubmit = true, pageSlug }: BlockRendererProps<FormBlockData>) {
```

E substituindo `block.id` por `formData.blockId` — atenção: `block.id` não está disponível nos dados, então passe-o via props ou use `formData.blockId`. Como `BlockRendererProps` não tem `id` de bloco, adicione um `blockId?: string` ao `BlockRendererProps`:

Em `_shared/types.ts`, acrescentar:
```typescript
export interface BlockRendererProps<T = unknown> {
  data: T;
  blockId?: string;       // ID do bloco (necessário para FormRenderer)
  pageSlug?: string;
  enableFormSubmit?: boolean;
  renderChild?: (block: PageBlock) => React.ReactNode;
}
```

E em `PageRenderer.tsx` (Task 17), passar `blockId={block.id}` ao Renderer.

No `FormRenderer`, substituir `block.id` por `blockId`:
```tsx
await submitForm({
  pageSlug: resolvedSlug,
  formBlockId: blockId ?? 'unknown',
  formData: values,
  honeypot: honeypot || undefined
});
```

- [ ] **Step 2: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/blocks/form/ client/src/blocks/_shared/
git commit -m "feat(blocks): renderer do bloco de formulário com blockId prop"
```

---

## Task 7: Renderer — recent-posts

**Files:**
- Create: `client/src/blocks/recent-posts/renderer.tsx`

- [ ] **Step 1: Criar `recent-posts/renderer.tsx`**

Copiar a função `RecentPostsRenderer` de `PageRenderer.tsx` linhas 907–963, ajustando imports:

```tsx
// client/src/blocks/recent-posts/renderer.tsx
import { useQuery } from '@tanstack/react-query';
import { ArticleCard } from '@/components/ArticleCard';
import { fetchArticles } from '@/api/queries';
import type { Article } from '@/types';
import type { PaginatedResponse } from '@/api/queries';
import type { BlockRendererProps } from '../_shared/types';
import type { RecentPostsBlockData } from './schema';
```

Após os imports, copiar o corpo da função de `PageRenderer.tsx` linhas 907–963, substituindo a assinatura por:

```tsx
export function RecentPostsRenderer({ data }: BlockRendererProps<RecentPostsBlockData>) {
```

E substituindo todas as referências a `block.data` por `data` (sem prefixo).

- [ ] **Step 2: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/blocks/recent-posts/
git commit -m "feat(blocks): renderer para recent-posts"
```

---

## Task 8: Renderers — social-links, whatsapp-cta, contact-info

**Files:**
- Create: `client/src/blocks/social-links/renderer.tsx`
- Create: `client/src/blocks/whatsapp-cta/renderer.tsx`
- Create: `client/src/blocks/contact-info/renderer.tsx`

Esses três renderers usam `useQuery` para buscar configurações do site e ícones do FontAwesome.

- [ ] **Step 1: `social-links/renderer.tsx`**

Copiar a função `SocialLinksRenderer` de `PageRenderer.tsx` linhas 1230–1307, ajustando imports:

```tsx
// client/src/blocks/social-links/renderer.tsx
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe, faEnvelope, faLink
} from '@fortawesome/free-solid-svg-icons';
import {
  faInstagram, faFacebook, faLinkedin, faYoutube, faTiktok, faXTwitter, faWhatsapp
} from '@fortawesome/free-brands-svg-icons';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings, SocialLink } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { SocialLinksBlockData } from './schema';
```

Substituir assinatura da função por:
```tsx
export function SocialLinksRenderer({ data }: BlockRendererProps<SocialLinksBlockData>) {
```

- [ ] **Step 2: `whatsapp-cta/renderer.tsx`**

Copiar a função `WhatsAppCtaRenderer` de `PageRenderer.tsx` linhas 1310–1366, ajustando imports:

```tsx
// client/src/blocks/whatsapp-cta/renderer.tsx
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { WhatsAppCtaBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function WhatsAppCtaRenderer({ data }: BlockRendererProps<WhatsAppCtaBlockData>) {
```

- [ ] **Step 3: `contact-info/renderer.tsx`**

Copiar a função `ContactInfoRenderer` de `PageRenderer.tsx` linhas 796–904, ajustando imports:

```tsx
// client/src/blocks/contact-info/renderer.tsx
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe, faEnvelope, faLink, faWhatsapp as faWhatsappSolid
} from '@fortawesome/free-solid-svg-icons';
import {
  faInstagram, faFacebook, faLinkedin, faYoutube, faTiktok, faXTwitter, faWhatsapp
} from '@fortawesome/free-brands-svg-icons';
import { RichText } from '@/components/RichText';
import { fetchSiteSettings } from '@/api/queries';
import type { SiteSettings, SocialLink } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { ContactInfoBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function ContactInfoRenderer({ data }: BlockRendererProps<ContactInfoBlockData>) {
```

Nota: o `faWhatsapp` importado de `free-solid-svg-icons` no arquivo original é na verdade da brands. Ajustar todos os ícones para importar do pacote correto (brands para logos de redes sociais, solid para ícones genéricos).

- [ ] **Step 4: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/social-links/ client/src/blocks/whatsapp-cta/ client/src/blocks/contact-info/
git commit -m "feat(blocks): renderers para social-links, whatsapp-cta, contact-info"
```

---

## Task 9: Renderer — hero

O renderer do `hero` é o mais complexo: suporta V1 (legado) e V2, e renderiza blocos filhos internamente. Usa o `renderChild` prop para evitar dependência circular com o registry.

**Files:**
- Create: `client/src/blocks/hero/renderer.tsx`

- [ ] **Step 1: Criar `hero/renderer.tsx`**

Copiar as funções de suporte e o `case 'hero'` de `PageRenderer.tsx` linhas 78–101 (helpers de altura) e 451–700 (render do hero), ajustando imports e assinatura:

```tsx
// client/src/blocks/hero/renderer.tsx
import type { CSSProperties } from 'react';
import { getBlockImageCropStylesNoTransform } from '@/utils/imageCrop';
import type { ImageBlockData, HeroBlockDataV2, HeroImageHeight } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { HeroBlockData } from './schema';

// --- Helpers de altura (copiar de PageRenderer.tsx linhas 78–101) ---
const HERO_IMAGE_HEIGHTS: Record<Exclude<HeroImageHeight, number>, string> = {
  sm: 'clamp(220px, 28vw, 320px)',
  md: 'clamp(280px, 34vw, 420px)',
  lg: 'clamp(340px, 40vw, 520px)',
  xl: 'clamp(420px, 48vw, 640px)'
};

function mapHeroHeightPctToPreset(heightPct?: number | null): keyof typeof HERO_IMAGE_HEIGHTS | null {
  if (typeof heightPct !== 'number' || Number.isNaN(heightPct)) return null;
  if (heightPct <= 45) return 'sm';
  if (heightPct <= 65) return 'md';
  if (heightPct <= 85) return 'lg';
  return 'xl';
}

function resolveHeroImageHeight(imageHeight: HeroImageHeight | null | undefined, heightPct?: number | null): string {
  if (typeof imageHeight === 'number' && Number.isFinite(imageHeight)) {
    return `${Math.max(120, Math.min(Math.round(imageHeight), 2000))}px`;
  }
  if (imageHeight && imageHeight in HERO_IMAGE_HEIGHTS) {
    return HERO_IMAGE_HEIGHTS[imageHeight as keyof typeof HERO_IMAGE_HEIGHTS];
  }
  const mapped = mapHeroHeightPctToPreset(heightPct ?? null) ?? 'lg';
  return HERO_IMAGE_HEIGHTS[mapped];
}
```

Após os helpers, copiar o corpo completo do `case 'hero'` de `PageRenderer.tsx` (linhas 451–700), substituindo:

```tsx
export function HeroRenderer({ data, pageSlug, enableFormSubmit, renderChild }: BlockRendererProps<HeroBlockData>) {
```

E substituindo cada chamada `<PageBlockView key={childBlock.id} block={childBlock} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />` por `renderChild?.(childBlock)`.

Exemplo de substituição:
```tsx
// ANTES (PageRenderer.tsx):
<PageBlockView key={childBlock.id} block={childBlock} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />

// DEPOIS (hero/renderer.tsx):
<span key={childBlock.id}>{renderChild?.(childBlock)}</span>
```

- [ ] **Step 2: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/blocks/hero/
git commit -m "feat(blocks): renderer hero V1+V2 com renderChild prop"
```

---

## Task 10: Forms — text, button, span

**Files:**
- Create: `client/src/blocks/text/Form.tsx`
- Create: `client/src/blocks/button/Form.tsx`
- Create: `client/src/blocks/span/Form.tsx`

- [ ] **Step 1: `text/Form.tsx`**

Copiar a função `TextBlockForm` de `AdminPageEditorPage.tsx` linhas 1951–1997, ajustando imports:

```tsx
// client/src/blocks/text/Form.tsx
import { RichTextEditor } from '@/components/RichTextEditor';
import type { BlockFormProps } from '../_shared/types';
import type { TextBlockData } from './schema';

export function TextForm({ value, onChange, onUploadingChange }: BlockFormProps<TextBlockData>) {
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Conteúdo</label>
          <RichTextEditor value={value.contentHtml} onChange={(val) => onChange({ ...value, contentHtml: val })} onUploadingChange={onUploadingChange} />
        </div>
        <div className="editor-field">
          <label>Largura</label>
          <div className="page-columns-toggle compact">
            {['normal', 'wide'].map((opt) => (
              <button key={opt} type="button" className={value.width === opt ? 'active' : ''} onClick={() => onChange({ ...value, width: opt as TextBlockData['width'] })}>
                {opt === 'wide' ? 'Largo' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-field">
          <label>Fundo</label>
          <div className="page-columns-toggle compact">
            {['none', 'soft'].map((opt) => (
              <button key={opt} type="button" className={value.background === opt ? 'active' : ''} onClick={() => onChange({ ...value, background: opt as TextBlockData['background'] })}>
                {opt === 'soft' ? 'Suave' : 'Nenhum'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `button/Form.tsx`**

Copiar a função `ButtonBlockForm` de `AdminPageEditorPage.tsx` linhas 2154–2204, ajustando imports:

```tsx
// client/src/blocks/button/Form.tsx
import { Switch } from '@/components/AdminUI';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import type { BlockFormProps } from '../_shared/types';
import type { ButtonBlockData } from './schema';

export function ButtonForm({ value, onChange }: BlockFormProps<ButtonBlockData>) {
  const linkValue: LinkPickerValue = {
    mode: (value.linkMode as string) ?? 'manual',
    href: value.href ?? '',
    pageKey: value.pageKey ?? null,
    pageId: value.pageId ?? null,
    slug: value.slug ?? null
  };
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Ex: Agendar sessão" />
        </div>
        <div className="editor-field">
          <LinkPicker label="Destino" value={linkValue} onChange={(val) => onChange({ ...value, href: val.href, linkMode: val.mode, pageKey: val.pageKey ?? null, pageId: val.pageId ?? null, slug: val.slug ?? null })} />
        </div>
        <div className="editor-field">
          <label>Estilo</label>
          <select value={value.variant ?? 'primary'} onChange={(e) => onChange({ ...value, variant: e.target.value as ButtonBlockData['variant'] })}>
            <option value="primary">Primário</option>
            <option value="secondary">Secundário</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div className="editor-field">
          <Switch checked={value.newTab ?? false} onChange={(val) => onChange({ ...value, newTab: val })} label="Abrir em nova aba" />
        </div>
        <div className="editor-field">
          <label>Ícone (opcional)</label>
          <input value={value.icon ?? ''} onChange={(e) => onChange({ ...value, icon: e.target.value })} placeholder="Ex: →" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `span/Form.tsx`**

Copiar a função `SpanBlockForm` de `AdminPageEditorPage.tsx` linhas 4124–4167, ajustando imports:

```tsx
// client/src/blocks/span/Form.tsx
import type { BlockFormProps } from '../_shared/types';
import type { SpanBlockData } from './schema';

export function SpanForm({ value, onChange }: BlockFormProps<SpanBlockData>) {
  const kind = value.kind ?? 'accent-bar';
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Tipo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'accent-bar', label: 'Barra de destaque' },
              { value: 'muted-text', label: 'Texto discreto' }
            ].map((opt) => (
              <button key={opt.value} type="button" className={kind === opt.value ? 'active' : ''} onClick={() => onChange({ ...value, kind: opt.value as SpanBlockData['kind'], text: opt.value === 'accent-bar' ? undefined : value.text })}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {kind === 'muted-text' && (
          <div className="editor-field">
            <label>Texto</label>
            <input type="text" value={value.text ?? ''} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Digite o texto" />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/text/ client/src/blocks/button/ client/src/blocks/span/
git commit -m "feat(blocks): forms para text, button, span"
```

---

## Task 11: Forms — pills, buttonGroup, social-links, whatsapp-cta

**Files:**
- Create: `client/src/blocks/pills/Form.tsx`
- Create: `client/src/blocks/button-group/Form.tsx`
- Create: `client/src/blocks/social-links/Form.tsx`
- Create: `client/src/blocks/whatsapp-cta/Form.tsx`

- [ ] **Step 1: `pills/Form.tsx`**

Copiar a função `PillsBlockForm` de `AdminPageEditorPage.tsx` linhas 3964–4123, ajustando imports:

```tsx
// client/src/blocks/pills/Form.tsx
import type { PillItem } from '@/types';
import type { BlockFormProps } from '../_shared/types';
import type { PillsBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function PillsForm({ value, onChange }: BlockFormProps<PillsBlockData>) {
```

Substituir ocorrências de `import('../types').PillItem` por `PillItem` e `import('../types').PillsBlockData` por `PillsBlockData`.

- [ ] **Step 2: `button-group/Form.tsx`**

Copiar a função `ButtonGroupBlockForm` de `AdminPageEditorPage.tsx` linhas 4170–4305, ajustando imports:

```tsx
// client/src/blocks/button-group/Form.tsx
import { Switch } from '@/components/AdminUI';
import { LinkPicker } from '@/components/LinkPicker';
import type { ButtonGroupButton } from '@/types';
import type { BlockFormProps } from '../_shared/types';
import type { ButtonGroupBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function ButtonGroupForm({ value, onChange }: BlockFormProps<ButtonGroupBlockData>) {
```

Substituir `import('../types').ButtonGroupButton` por `ButtonGroupButton`.

- [ ] **Step 3: `social-links/Form.tsx`**

Copiar a função `SocialLinksBlockForm` de `AdminPageEditorPage.tsx` linhas 4307–4405, ajustando imports:

```tsx
// client/src/blocks/social-links/Form.tsx
import { Switch } from '@/components/AdminUI';
import type { BlockFormProps } from '../_shared/types';
import type { SocialLinksBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function SocialLinksForm({ value, onChange }: BlockFormProps<SocialLinksBlockData>) {
```

Substituir `import('../types').SocialLinksBlockData` por `SocialLinksBlockData`.

- [ ] **Step 4: `whatsapp-cta/Form.tsx`**

Copiar a função `WhatsAppCtaBlockForm` de `AdminPageEditorPage.tsx` linhas 4407–4473, ajustando imports:

```tsx
// client/src/blocks/whatsapp-cta/Form.tsx
import { Switch } from '@/components/AdminUI';
import type { BlockFormProps } from '../_shared/types';
import type { WhatsAppCtaBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function WhatsAppCtaForm({ value, onChange }: BlockFormProps<WhatsAppCtaBlockData>) {
```

Substituir `import('../types').WhatsAppCtaBlockData` por `WhatsAppCtaBlockData`.

- [ ] **Step 5: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add client/src/blocks/pills/ client/src/blocks/button-group/ client/src/blocks/social-links/ client/src/blocks/whatsapp-cta/
git commit -m "feat(blocks): forms para pills, buttonGroup, social-links, whatsapp-cta"
```

---

## Task 12: Forms — image, cta, media-text

**Files:**
- Create: `client/src/blocks/image/Form.tsx`
- Create: `client/src/blocks/cta/Form.tsx`
- Create: `client/src/blocks/media-text/Form.tsx`

- [ ] **Step 1: `image/Form.tsx`**

Copiar a função `ImageBlockForm` de `AdminPageEditorPage.tsx` linhas 1999–2153, ajustando imports:

```tsx
// client/src/blocks/image/Form.tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import type { CropRatio } from '@/components/FlexibleImageCropModal';
import type { BlockFormProps } from '../_shared/types';
import type { ImageBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function ImageForm({ value, onChange, onUploadingChange }: BlockFormProps<ImageBlockData>) {
```

- [ ] **Step 2: `cta/Form.tsx`**

Copiar a função `CtaBlockForm` de `AdminPageEditorPage.tsx` linhas 2206–2321, ajustando imports:

```tsx
// client/src/blocks/cta/Form.tsx
import { useState } from 'react';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import type { BlockFormProps } from '../_shared/types';
import type { CtaBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function CtaForm({ value, onChange }: BlockFormProps<CtaBlockData>) {
```

- [ ] **Step 3: `media-text/Form.tsx`**

Copiar a função `MediaTextBlockForm` de `AdminPageEditorPage.tsx` linhas 2322–2460, ajustando imports:

```tsx
// client/src/blocks/media-text/Form.tsx
import { useState } from 'react';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import type { CropRatio } from '@/components/FlexibleImageCropModal';
import { RichTextEditor } from '@/components/RichTextEditor';
import type { BlockFormProps } from '../_shared/types';
import type { MediaTextBlockData } from './schema';
```

Substituir assinatura por:
```tsx
export function MediaTextForm({ value, onChange, onUploadingChange }: BlockFormProps<MediaTextBlockData>) {
```

- [ ] **Step 4: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/image/ client/src/blocks/cta/ client/src/blocks/media-text/
git commit -m "feat(blocks): forms para image, cta, media-text"
```

---

## Task 13: Forms — cards, form block, hero

**Files:**
- Create: `client/src/blocks/cards/Form.tsx`
- Create: `client/src/blocks/form/Form.tsx`
- Create: `client/src/blocks/hero/Form.tsx`

- [ ] **Step 1: `cards/Form.tsx`**

Copiar a função `CardBlockForm` de `AdminPageEditorPage.tsx` linhas 2461–2752, ajustando imports:

```tsx
// client/src/blocks/cards/Form.tsx
import { useState } from 'react';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import type { BlockFormProps } from '../_shared/types';
import type { CardBlockData, CardItem } from './schema';
```

Substituir assinatura por:
```tsx
export function CardsForm({ value, onChange }: BlockFormProps<CardBlockData>) {
```

Substituir todas as ocorrências de `import('../types').CardItem` por `CardItem`.

- [ ] **Step 2: `form/Form.tsx`**

Copiar a função `FormBlockForm` de `AdminPageEditorPage.tsx` linhas 2753–3577, ajustando imports:

```tsx
// client/src/blocks/form/Form.tsx
import { v4 as uuidv4 } from 'uuid';
import type { BlockFormProps } from '../_shared/types';
import type { FormBlockData, FormField } from './schema';
```

Substituir assinatura por:
```tsx
export function FormBlockForm({ value, onChange }: BlockFormProps<FormBlockData>) {
```

Substituir `import('../types').FormField` por `FormField`.

- [ ] **Step 3: `hero/Form.tsx`**

Copiar a função `HeroBlockForm` de `AdminPageEditorPage.tsx` linhas 3578–3963, ajustando imports:

```tsx
// client/src/blocks/hero/Form.tsx
import { useState } from 'react';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Switch } from '@/components/AdminUI';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import type {
  HeroBlockData, HeroBlockDataV1, HeroBlockDataV2,
  HeroImage, HeroCard, HeroFourCards
} from '@/types';
import type { BlockFormProps } from '../_shared/types';
```

Substituir assinatura por:
```tsx
export function HeroForm({ value, onChange }: BlockFormProps<HeroBlockData>) {
```

- [ ] **Step 4: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/blocks/cards/ client/src/blocks/form/ client/src/blocks/hero/
git commit -m "feat(blocks): forms para cards, form, hero"
```

---

## Task 14: Forms — mover recent-posts, services, contact-info

Os três componentes já existem em `components/`. Mover para `blocks/*/Form.tsx` com nomes de export alinhados ao padrão do registry.

**Files:**
- Create: `client/src/blocks/recent-posts/Form.tsx`
- Create: `client/src/blocks/services/Form.tsx`
- Create: `client/src/blocks/contact-info/Form.tsx`
- Delete: `client/src/components/RecentPostsBlockForm.tsx`
- Delete: `client/src/components/ServicesBlockForm.tsx`
- Delete: `client/src/components/ContactInfoBlockForm.tsx`

- [ ] **Step 1: `recent-posts/Form.tsx`**

Copiar o conteúdo de `client/src/components/RecentPostsBlockForm.tsx`, ajustando imports para usar `@/` e adicionando export nomeado padrão:

```tsx
// client/src/blocks/recent-posts/Form.tsx
import type { RecentPostsBlockData } from '@/types';
import { LinkPicker } from '@/components/LinkPicker';
import type { BlockFormProps } from '../_shared/types';

// Renomear export de RecentPostsBlockForm para RecentPostsForm
export function RecentPostsForm({ value, onChange }: BlockFormProps<RecentPostsBlockData>) {
  // ... conteúdo de RecentPostsBlockForm.tsx (copiar o corpo da função)
}
```

- [ ] **Step 2: `services/Form.tsx`**

Copiar o conteúdo de `client/src/components/ServicesBlockForm.tsx`, ajustando imports:

```tsx
// client/src/blocks/services/Form.tsx
import { v4 as uuidv4 } from 'uuid';
import type { ServicesBlockData } from '@/types';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { BlockFormProps } from '../_shared/types';

export function ServicesForm({ value, onChange }: BlockFormProps<ServicesBlockData>) {
  // ... conteúdo de ServicesBlockForm.tsx
}
```

- [ ] **Step 3: `contact-info/Form.tsx`**

Copiar o conteúdo de `client/src/components/ContactInfoBlockForm.tsx`, ajustando imports:

```tsx
// client/src/blocks/contact-info/Form.tsx
import { RichTextEditor } from '@/components/RichTextEditor';
import type { ContactInfoBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function ContactInfoForm({ value, onChange }: BlockFormProps<ContactInfoBlockData>) {
  // ... conteúdo de ContactInfoBlockForm.tsx
}
```

- [ ] **Step 4: Remover arquivos originais**

```bash
rm client/src/components/RecentPostsBlockForm.tsx
rm client/src/components/ServicesBlockForm.tsx
rm client/src/components/ContactInfoBlockForm.tsx
```

- [ ] **Step 5: Verificar build**

```bash
cd client && npm run build
```

Expected: sem erros. Se houver erros de import (algum componente ainda referenciando os arquivos removidos), corrigi-los agora.

- [ ] **Step 6: Commit**

```bash
git add client/src/blocks/recent-posts/ client/src/blocks/services/ client/src/blocks/contact-info/
git rm client/src/components/RecentPostsBlockForm.tsx client/src/components/ServicesBlockForm.tsx client/src/components/ContactInfoBlockForm.tsx
git commit -m "feat(blocks): forms recent-posts, services, contact-info movidos para blocks/"
```

---

## Task 15: Populate `registry.ts`

**Files:**
- Modify: `client/src/blocks/registry.ts`

- [ ] **Step 1: Preencher o registry com todos os 16 blocos**

```typescript
// client/src/blocks/registry.ts
import type { BlockType } from '@/types';
import type { BlockConfig } from './_shared/types';

import { TextRenderer } from './text/renderer';
import { TextForm } from './text/Form';
import { textDefault } from './text/schema';

import { ImageRenderer } from './image/renderer';
import { ImageForm } from './image/Form';
import { imageDefault } from './image/schema';

import { ButtonRenderer } from './button/renderer';
import { ButtonForm } from './button/Form';
import { buttonDefault } from './button/schema';

import { SpanRenderer } from './span/renderer';
import { SpanForm } from './span/Form';
import { spanDefault } from './span/schema';

import { PillsRenderer } from './pills/renderer';
import { PillsForm } from './pills/Form';
import { pillsDefault } from './pills/schema';

import { ButtonGroupRenderer } from './button-group/renderer';
import { ButtonGroupForm } from './button-group/Form';
import { buttonGroupDefault } from './button-group/schema';

import { CtaRenderer } from './cta/renderer';
import { CtaForm } from './cta/Form';
import { ctaDefault } from './cta/schema';

import { MediaTextRenderer } from './media-text/renderer';
import { MediaTextForm } from './media-text/Form';
import { mediaTextDefault } from './media-text/schema';

import { CardsRenderer } from './cards/renderer';
import { CardsForm } from './cards/Form';
import { cardsDefault } from './cards/schema';

import { FormRenderer } from './form/renderer';
import { FormBlockForm } from './form/Form';
import { formDefault } from './form/schema';

import { HeroRenderer } from './hero/renderer';
import { HeroForm } from './hero/Form';
import { heroDefault } from './hero/schema';

import { RecentPostsRenderer } from './recent-posts/renderer';
import { RecentPostsForm } from './recent-posts/Form';
import { recentPostsDefault } from './recent-posts/schema';

import { SocialLinksRenderer } from './social-links/renderer';
import { SocialLinksForm } from './social-links/Form';
import { socialLinksDefault } from './social-links/schema';

import { WhatsAppCtaRenderer } from './whatsapp-cta/renderer';
import { WhatsAppCtaForm } from './whatsapp-cta/Form';
import { whatsAppCtaDefault } from './whatsapp-cta/schema';

import { ContactInfoRenderer } from './contact-info/renderer';
import { ContactInfoForm } from './contact-info/Form';
import { contactInfoDefault } from './contact-info/schema';

import { ServicesRenderer } from './services/renderer';
import { ServicesForm } from './services/Form';
import { servicesDefault } from './services/schema';

export const blockRegistry: Record<BlockType, BlockConfig> = {
  text:           { label: 'Texto',              defaultData: textDefault,         renderer: TextRenderer as BlockConfig['renderer'],           form: TextForm as BlockConfig['form'] },
  image:          { label: 'Imagem',             defaultData: imageDefault,        renderer: ImageRenderer as BlockConfig['renderer'],          form: ImageForm as BlockConfig['form'] },
  button:         { label: 'Botão',              defaultData: buttonDefault,       renderer: ButtonRenderer as BlockConfig['renderer'],         form: ButtonForm as BlockConfig['form'] },
  span:           { label: 'Elemento',           defaultData: spanDefault,         renderer: SpanRenderer as BlockConfig['renderer'],           form: SpanForm as BlockConfig['form'] },
  pills:          { label: 'Pills',              defaultData: pillsDefault,        renderer: PillsRenderer as BlockConfig['renderer'],          form: PillsForm as BlockConfig['form'] },
  buttonGroup:    { label: 'Grupo de Botões',    defaultData: buttonGroupDefault,  renderer: ButtonGroupRenderer as BlockConfig['renderer'],    form: ButtonGroupForm as BlockConfig['form'] },
  cta:            { label: 'CTA',                defaultData: ctaDefault,          renderer: CtaRenderer as BlockConfig['renderer'],            form: CtaForm as BlockConfig['form'] },
  'media-text':   { label: 'Imagem + Texto',     defaultData: mediaTextDefault,    renderer: MediaTextRenderer as BlockConfig['renderer'],      form: MediaTextForm as BlockConfig['form'] },
  cards:          { label: 'Cards',              defaultData: cardsDefault,        renderer: CardsRenderer as BlockConfig['renderer'],          form: CardsForm as BlockConfig['form'] },
  form:           { label: 'Formulário',         defaultData: formDefault,         renderer: FormRenderer as BlockConfig['renderer'],           form: FormBlockForm as BlockConfig['form'] },
  hero:           { label: 'Hero',               defaultData: heroDefault,         renderer: HeroRenderer as BlockConfig['renderer'],           form: HeroForm as BlockConfig['form'] },
  'recent-posts': { label: 'Posts Recentes',     defaultData: recentPostsDefault,  renderer: RecentPostsRenderer as BlockConfig['renderer'],   form: RecentPostsForm as BlockConfig['form'] },
  'social-links': { label: 'Redes Sociais',      defaultData: socialLinksDefault,  renderer: SocialLinksRenderer as BlockConfig['renderer'],   form: SocialLinksForm as BlockConfig['form'] },
  'whatsapp-cta': { label: 'WhatsApp CTA',       defaultData: whatsAppCtaDefault,  renderer: WhatsAppCtaRenderer as BlockConfig['renderer'],   form: WhatsAppCtaForm as BlockConfig['form'] },
  'contact-info': { label: 'Info de Contato',    defaultData: contactInfoDefault,  renderer: ContactInfoRenderer as BlockConfig['renderer'],   form: ContactInfoForm as BlockConfig['form'] },
  services:       { label: 'Serviços',           defaultData: servicesDefault,     renderer: ServicesRenderer as BlockConfig['renderer'],       form: ServicesForm as BlockConfig['form'] },
};
```

- [ ] **Step 2: Verificar build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/blocks/registry.ts
git commit -m "feat(blocks): registry completo com 16 blocos"
```

---

## Task 16: Simplificar `PageRenderer.tsx`

`PageBlockView` (switch de 520 linhas, linhas 270–793) é substituído por lookup no registry. As funções de renderer das linhas 795–1366 são removidas (agora vivem em `blocks/`).

**Files:**
- Modify: `client/src/components/PageRenderer.tsx`

- [ ] **Step 1: Adicionar imports no topo de `PageRenderer.tsx`**

Logo após os imports existentes (após linha 77, antes da constante `HERO_IMAGE_HEIGHTS`), adicionar:

```typescript
import { blockRegistry } from '@/blocks/registry';
import { BlockErrorBoundary } from './BlockErrorBoundary';
import type { BlockType } from '@/types';
```

Remover também os imports que só eram usados nos renderers movidos (FontAwesome brands, faCheck, etc.). Manter apenas os imports usados em `SectionRenderer`, `calculateRowSpan`, e nas funções que permanecem no arquivo.

- [ ] **Step 2: Remover constantes de altura do hero que agora vivem em `hero/renderer.tsx`**

Remover linhas 78–101 (`HERO_IMAGE_HEIGHTS`, `mapHeroHeightPctToPreset`, `resolveHeroImageHeight`) — agora vivem em `blocks/hero/renderer.tsx`.

- [ ] **Step 3: Substituir `PageBlockView` (linhas 270–793)**

Substituir a função inteira por:

```tsx
export function PageBlockView({ block, enableFormSubmit = true, pageSlug }: { block: PageBlock; enableFormSubmit?: boolean; pageSlug?: string }) {
  if (!block) return null;

  const config = blockRegistry[block.type as BlockType];
  if (!config) return null;

  const Renderer = config.renderer as React.ComponentType<{
    data: unknown;
    blockId?: string;
    pageSlug?: string;
    enableFormSubmit?: boolean;
    renderChild?: (b: PageBlock) => React.ReactNode;
  }>;

  const renderChild = (childBlock: PageBlock): React.ReactNode => {
    const childConfig = blockRegistry[childBlock.type as BlockType];
    if (!childConfig) return null;
    const ChildRenderer = childConfig.renderer as typeof Renderer;
    return (
      <ChildRenderer
        key={childBlock.id}
        data={childBlock.data}
        blockId={childBlock.id}
        pageSlug={pageSlug}
        enableFormSubmit={enableFormSubmit}
        renderChild={renderChild}
      />
    );
  };

  return (
    <BlockErrorBoundary>
      <Renderer
        data={block.data}
        blockId={block.id}
        pageSlug={pageSlug}
        enableFormSubmit={enableFormSubmit}
        renderChild={renderChild}
      />
    </BlockErrorBoundary>
  );
}
```

- [ ] **Step 4: Remover funções de renderer das linhas 795–1366**

Deletar as funções: `ContactInfoRenderer`, `RecentPostsRenderer`, `ServicesRenderer`, `FormRenderer`, `resolvePageSlugFromLocation`, `SocialLinksRenderer`, `WhatsAppCtaRenderer`.

Manter: `PageRenderer`, `PageRendererCore`, `SectionRenderer`, `calculateRowSpan`, `isRenderableBlock`, `BlockPosition` type, e os imports que elas usam.

- [ ] **Step 5: Adicionar import `React`**

`BlockErrorBoundary` usa React como classe component; adicionar `import React from 'react';` se não existir.

- [ ] **Step 6: Verificar build**

```bash
cd client && npm run build
```

Expected: sem erros. O `PageRenderer.tsx` deve ter passado de 1366 linhas para ~300 linhas.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/PageRenderer.tsx
git commit -m "refactor(PageRenderer): switch de 520 linhas substituído por registry lookup"
```

---

## Task 17: Simplificar `AdminPageEditorPage.tsx`

Substituir dois painéis de formulário (16 condicionais cada) por lookup no registry, e o `labelMap` inline por `blockRegistry[type].label`.

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, após os imports existentes, adicionar:

```typescript
import { blockRegistry } from '@/blocks/registry';
import type { BlockType } from '@/types';
```

Remover os imports de `RecentPostsBlockForm`, `ServicesBlockForm`, `ContactInfoBlockForm` (linhas 14–16).

- [ ] **Step 2: Substituir `labelMap` (linhas 1420–1431)**

Localizar o objeto `labelMap` na função que renderiza os cards de bloco (função anônima que tem `const label = labelMap[block.type] || block.type;`).

Substituir todo o bloco `const labelMap = { ... }; const label = labelMap[block.type] || block.type;` por:

```typescript
const label = blockRegistry[block.type as BlockType]?.label ?? block.type;
```

- [ ] **Step 3: Substituir painel de formulário no modal de EDIÇÃO**

Localizar o bloco de condicionais de formulário que começa em `{selectedType === 'text' && draft && (` (aproximadamente linha 1822 no arquivo original).

Substituir todos os blocos `{selectedType === 'X' && draft && (<XBlockForm ... />)}` (de `text` a `contact-info`) por:

```tsx
{draft && (() => {
  const config = blockRegistry[selectedType as BlockType];
  if (!config) return null;
  const Form = config.form as React.ComponentType<{
    value: unknown;
    onChange: (value: unknown) => void;
    onUploadingChange?: (uploading: boolean) => void;
  }>;
  return (
    <Form
      value={draft.data}
      onChange={(data) => setDraft((prev) => (prev ? { ...prev, data: data as PageBlock['data'] } : prev))}
      onUploadingChange={setUploading}
    />
  );
})()}
```

- [ ] **Step 4: Substituir painel de formulário no modal de ADIÇÃO**

Localizar o segundo bloco de condicionais (aproximadamente linha 3301 no arquivo original, no modal de "adicionar bloco").

Substituir todos os blocos `{selectedType === 'X' && draft && (<XBlockForm ... />)}` por:

```tsx
{draft && (() => {
  const config = blockRegistry[selectedType as BlockType];
  if (!config) return null;
  const Form = config.form as React.ComponentType<{
    value: unknown;
    onChange: (value: unknown) => void;
    onUploadingChange?: (uploading: boolean) => void;
  }>;
  return (
    <Form
      value={draft.data}
      onChange={(data) => setDraft((prev) => (prev ? { ...prev, data: data as PageBlock['data'] } : prev))}
      onUploadingChange={() => {}}
    />
  );
})()}
```

- [ ] **Step 5: Remover funções de formulário inline (linhas 1951–4473)**

Deletar todas as funções: `TextBlockForm`, `ImageBlockForm`, `ButtonBlockForm`, `CtaBlockForm`, `MediaTextBlockForm`, `CardBlockForm`, `FormBlockForm`, `HeroBlockForm`, `PillsBlockForm`, `SpanBlockForm`, `ButtonGroupBlockForm`, `SocialLinksBlockForm`, `WhatsAppCtaBlockForm`.

- [ ] **Step 6: Verificar build**

```bash
cd client && npm run build
```

Expected: sem erros. `AdminPageEditorPage.tsx` deve ter passado de ~4473 linhas para ~2000 linhas.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/AdminPageEditorPage.tsx
git commit -m "refactor(AdminPageEditor): 16 formulários inline substituídos por registry lookup"
```

---

## Verificação final

- [ ] **Build final limpo**

```bash
cd client && npm run build
```

Expected: zero erros, zero warnings TypeScript relevantes.

- [ ] **Teste manual: página pública**

Abrir http://localhost:5173 (com `npm run dev` rodando), navegar por uma página com hero, texto, cards. Verificar que todos os blocos renderizam corretamente.

- [ ] **Teste manual: admin**

Abrir http://localhost:5173/admin/pages, editar uma página, clicar em "Editar" em cada tipo de bloco. Verificar que o formulário abre e salva corretamente.

- [ ] **Teste: adicionar novo bloco**

No admin, clicar em "Adicionar bloco", selecionar cada tipo e verificar que o formulário padrão aparece com os dados de `defaultData`.

---

## Checklist pós-implementação

- [ ] `PageRenderer.tsx` < 350 linhas
- [ ] `AdminPageEditorPage.tsx` < 2100 linhas
- [ ] `client/src/blocks/` tem 16 subpastas, cada uma com `schema.ts`, `renderer.tsx`, `Form.tsx`
- [ ] `registry.ts` tem exatamente 16 entradas
- [ ] Adicionar um novo bloco no futuro = criar 3 arquivos + 1 linha no registry
