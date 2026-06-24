# BackgroundPicker — Fundos de Seção e Bloco

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o sistema de presets de fundo de seção por um seletor de 3 modos (Nenhum / Cor sólida / Imagem com overlay) que se aplica tanto a seções quanto a blocos individuais.

**Architecture:** Um componente `BackgroundPicker` compartilhado (reutilizado em `SectionSettingsPanel` e `BlockInspector`) consome uma função utilitária pura `buildBgStyle` que converte a config em estilos CSS. O renderer público (`PageRenderer`) e o canvas do editor (`SectionEditor`, `EditableBlock`) usam o mesmo utilitário para garantir paridade visual.

**Tech Stack:** React 19, TypeScript strict, `ImagePickerModal` + `FlexibleImageCropModal` (já existentes), `SegmentedControl` + `ColorSwatchPicker` + `RangeRow` (já existentes em `StyleControls/`).

## Global Constraints

- TypeScript strict — sem `any` sem eslint-disable justificado
- Sem `console.log` em código de produção (exceto onde já existia e não foi alterado)
- Imports via alias `@/` dentro de `client/src/`
- CSS via tokens da marca (`--color-forest`, etc.) — nunca hex azul/cinza genérico
- Verificar build (`cd client && npm run build`) e testes (`npx vitest run`) ao final de cada tarefa
- Diretório base do editor: `client/src/pages/AdminPageEditorPage/`
- Presets legados (`background: 'soft'|'dark'|'earthy'`) devem continuar funcionando no renderer público (retrocompatibilidade sem migration de banco)

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `client/src/types/layout.ts` |
| Modificar | `client/src/types/blocks.ts` |
| Criar | `client/src/utils/backgroundHelpers.ts` |
| Criar | `client/src/utils/backgroundHelpers.test.ts` |
| Criar | `client/src/components/StyleControls/BackgroundPicker.tsx` |
| Modificar | `client/src/components/StyleControls/index.ts` |
| Modificar | `client/src/App.css` |
| Modificar | `client/src/pages/AdminPageEditorPage/components/SectionSettingsPanel.tsx` |
| Modificar | `client/src/pages/AdminPageEditorPage/components/BlockInspector.tsx` |
| Modificar | `client/src/pages/AdminPageEditorPage/hooks/useBlockManager.ts` |
| Modificar | `client/src/pages/AdminPageEditorPage/index.tsx` |
| Modificar | `client/src/components/PageRenderer.tsx` |
| Modificar | `client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx` |
| Modificar | `client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx` |

---

## Task 1: Tipos — `BackgroundImageConfig` + `backgroundMode`/`backgroundImage` em seções + `blockBackground` em blocos

**Files:**
- Modify: `client/src/types/layout.ts`
- Modify: `client/src/types/blocks.ts`

**Interfaces:**
- Produces: `BackgroundImageConfig` (exportado de `layout.ts`), campos `backgroundMode` e `backgroundImage` em `PageSection['settings']`, campo `blockBackground` em todos os 16 variants de `PageBlock`

- [ ] **Step 1: Adicionar `BackgroundImageConfig` e novos campos ao `PageSection['settings']` em `layout.ts`**

Substituir o bloco `settings?` existente (linhas 27-42) pelo seguinte (mantendo todos os campos antigos):

```typescript
// Novo tipo exportado — representa a config de imagem de fundo
export type BackgroundImageConfig = {
  mediaId: string;
  url: string;
  overlayOpacity?: number;  // 0-80, default 0
  overlayColor?: 'dark' | 'light';  // default 'dark'
};

export type PageSection = {
  id: string;
  kind?: 'normal' | 'hero';
  columns: 1 | 2 | 3;
  columnsLayout?: 2 | 3;
  cols: Array<{ id: string; blocks: PageBlock[] }>;
  settings?: {
    // --- legado (não editável pela nova UI, mantido para retrocompatibilidade) ---
    background?: 'none' | 'soft' | 'dark' | 'earthy';
    backgroundStyle?: 'none' | 'soft' | 'dark' | 'earthy';
    // --- novo sistema de fundo ---
    backgroundMode?: 'none' | 'color' | 'image';
    backgroundColor?: string;
    backgroundImage?: BackgroundImageConfig;
    // --- demais campos (inalterados) ---
    padding?: 'normal' | 'compact' | 'large';
    density?: 'compact' | 'normal' | 'large';
    height?: 'normal' | 'tall';
    hidden?: boolean;
    name?: string;
    anchorId?: string;
    columnGap?: 'sm' | 'md' | 'lg';
    verticalAlign?: 'top' | 'center' | 'bottom';
    maxWidth?: 'normal' | 'wide';
    width?: 'normal' | 'wide';
    columnsLayout?: 2 | 3;
  };
};
```

- [ ] **Step 2: Adicionar `blockBackground` a todos os 16 variants de `PageBlock` em `blocks.ts`**

Localizar o union `PageBlock` (começa em `export type PageBlock =`) e adicionar `blockBackground?: BlockBackground` a todos os 16 variants. Primeiro adicionar o tipo auxiliar logo antes do union:

```typescript
// Adicionar antes de `export type PageBlock =`:
import type { BackgroundImageConfig } from './layout';

export type BlockBackground = {
  mode: 'none' | 'color' | 'image';
  color?: string;
  image?: BackgroundImageConfig;
};
```

Depois, em cada linha do union, adicionar `blockBackground?: BlockBackground;` após `updatedAt?: string`. Exemplo para os primeiros 3 variants (repetir para todos os 16):

```typescript
export type PageBlock =
  | { id: string; type: 'text';        colSpan?: number; rowIndex?: number; data: TextBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'image';       colSpan?: number; rowIndex?: number; data: ImageBlockData;       isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'button';      colSpan?: number; rowIndex?: number; data: ButtonBlockData;      isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cards';       colSpan?: number; rowIndex?: number; data: CardBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'form';        colSpan?: number; rowIndex?: number; data: FormBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'hero';        colSpan?: number; rowIndex?: number; data: HeroBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'pills';       colSpan?: number; rowIndex?: number; data: PillsBlockData;       isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'span';        colSpan?: number; rowIndex?: number; data: SpanBlockData;        isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'buttonGroup'; colSpan?: number; rowIndex?: number; data: ButtonGroupBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'recent-posts';colSpan?: number; rowIndex?: number; data: RecentPostsBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'social-links';colSpan?: number; rowIndex?: number; data: SocialLinksBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'whatsapp-cta';colSpan?: number; rowIndex?: number; data: WhatsAppCtaBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'contact-info';colSpan?: number; rowIndex?: number; data: ContactInfoBlockData; isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'services';    colSpan?: number; rowIndex?: number; data: ServicesBlockData;    isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'cta';         colSpan?: number; rowIndex?: number; data: CtaBlockData;         isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string }
  | { id: string; type: 'media-text';  colSpan?: number; rowIndex?: number; data: MediaTextBlockData;   isLocked?: boolean; visible?: boolean; blockBackground?: BlockBackground; createdAt?: string; updatedAt?: string };
```

- [ ] **Step 3: Verificar que `BlockBackground` e `BackgroundImageConfig` são re-exportados por `client/src/types/index.ts`**

Abrir `client/src/types/index.ts` e confirmar que `layout.ts` e `blocks.ts` já estão re-exportados. Se `BlockBackground` não for re-exportado automaticamente, adicionar:

```typescript
export type { BackgroundImageConfig } from './layout';
export type { BlockBackground } from './blocks';
```

- [ ] **Step 4: Build**

```bash
cd client && npm run build
```
Expected: `✓ built` sem erros TypeScript.

- [ ] **Step 5: Commit**

```bash
git add client/src/types/layout.ts client/src/types/blocks.ts client/src/types/index.ts
git commit -m "feat(types): BackgroundImageConfig, backgroundMode em seções e blockBackground em blocos"
```

---

## Task 2: Utilitário `backgroundHelpers.ts` com testes

**Files:**
- Create: `client/src/utils/backgroundHelpers.ts`
- Create: `client/src/utils/backgroundHelpers.test.ts`

**Interfaces:**
- Consumes: `BackgroundImageConfig` de `@/types`
- Produces:
  - `BackgroundConfig` — tipo da config de fundo (`mode`, `color?`, `image?`)
  - `BgStyleResult` — tipo do resultado CSS (`wrapperStyle`, `overlayStyle?`)
  - `buildBgStyle(config: BackgroundConfig): BgStyleResult` — converte config em estilos
  - `sectionSettingsToBgConfig(settings): BackgroundConfig` — extrai config dos settings de seção

- [ ] **Step 1: Escrever o arquivo de testes primeiro**

Criar `client/src/utils/backgroundHelpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildBgStyle, sectionSettingsToBgConfig } from './backgroundHelpers';

describe('buildBgStyle', () => {
  it('mode none retorna wrapperStyle vazio sem overlayStyle', () => {
    const result = buildBgStyle({ mode: 'none' });
    expect(result.wrapperStyle).toEqual({});
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode color com cor retorna background inline', () => {
    const result = buildBgStyle({ mode: 'color', color: '#ff0000' });
    expect(result.wrapperStyle).toEqual({ background: '#ff0000' });
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode color sem cor retorna wrapperStyle vazio', () => {
    const result = buildBgStyle({ mode: 'color' });
    expect(result.wrapperStyle).toEqual({});
  });

  it('mode image com url retorna backgroundImage cover sem overlay quando opacity 0', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 0 }
    });
    expect(result.wrapperStyle.backgroundImage).toBe('url(/foto.jpg)');
    expect(result.wrapperStyle.backgroundSize).toBe('cover');
    expect(result.wrapperStyle.backgroundPosition).toBe('center');
    expect(result.wrapperStyle.position).toBe('relative');
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode image com overlay escuro retorna rgba preto', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 50, overlayColor: 'dark' }
    });
    expect(result.overlayStyle?.background).toBe('rgba(0,0,0,0.5)');
    expect(result.overlayStyle?.position).toBe('absolute');
    expect(result.overlayStyle?.pointerEvents).toBe('none');
  });

  it('mode image com overlay claro retorna rgba branco', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 40, overlayColor: 'light' }
    });
    expect(result.overlayStyle?.background).toBe('rgba(255,255,255,0.4)');
  });

  it('mode image sem url retorna wrapperStyle vazio', () => {
    const result = buildBgStyle({ mode: 'image' });
    expect(result.wrapperStyle).toEqual({});
  });
});

describe('sectionSettingsToBgConfig', () => {
  it('sem backgroundMode retorna mode none', () => {
    const result = sectionSettingsToBgConfig({});
    expect(result.mode).toBe('none');
  });

  it('backgroundMode color retorna config de cor', () => {
    const result = sectionSettingsToBgConfig({ backgroundMode: 'color', backgroundColor: '#abc' });
    expect(result).toEqual({ mode: 'color', color: '#abc' });
  });

  it('backgroundMode image retorna config de imagem', () => {
    const img = { mediaId: '1', url: '/a.jpg', overlayOpacity: 20, overlayColor: 'dark' as const };
    const result = sectionSettingsToBgConfig({ backgroundMode: 'image', backgroundImage: img });
    expect(result).toEqual({ mode: 'image', image: img });
  });

  it('backgroundMode none retorna mode none', () => {
    const result = sectionSettingsToBgConfig({ backgroundMode: 'none' });
    expect(result.mode).toBe('none');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd client && npx vitest run src/utils/backgroundHelpers.test.ts
```
Expected: erro de importação (`Cannot find module './backgroundHelpers'`).

- [ ] **Step 3: Criar `client/src/utils/backgroundHelpers.ts`**

```typescript
import type { CSSProperties } from 'react';
import type { BackgroundImageConfig } from '@/types';

export type BackgroundConfig = {
  mode: 'none' | 'color' | 'image';
  color?: string;
  image?: BackgroundImageConfig;
};

export type BgStyleResult = {
  wrapperStyle: CSSProperties;
  overlayStyle?: CSSProperties;
};

export function buildBgStyle(config: BackgroundConfig): BgStyleResult {
  if (config.mode === 'color' && config.color) {
    return { wrapperStyle: { background: config.color } };
  }

  if (config.mode === 'image' && config.image?.url) {
    const { url, overlayOpacity = 0, overlayColor = 'dark' } = config.image;
    const wrapperStyle: CSSProperties = {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    };
    const overlayStyle: CSSProperties | undefined =
      overlayOpacity > 0
        ? {
            position: 'absolute',
            inset: 0,
            background:
              overlayColor === 'light'
                ? `rgba(255,255,255,${overlayOpacity / 100})`
                : `rgba(0,0,0,${overlayOpacity / 100})`,
            pointerEvents: 'none'
          }
        : undefined;
    return { wrapperStyle, overlayStyle };
  }

  return { wrapperStyle: {} };
}

export function sectionSettingsToBgConfig(settings: {
  backgroundMode?: 'none' | 'color' | 'image';
  backgroundColor?: string;
  backgroundImage?: BackgroundImageConfig;
}): BackgroundConfig {
  if (settings.backgroundMode === 'color') {
    return { mode: 'color', color: settings.backgroundColor };
  }
  if (settings.backgroundMode === 'image') {
    return { mode: 'image', image: settings.backgroundImage };
  }
  return { mode: 'none' };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
cd client && npx vitest run src/utils/backgroundHelpers.test.ts
```
Expected: todos os testes passando.

- [ ] **Step 5: Rodar suite completa de testes**

```bash
cd client && npx vitest run
```
Expected: todos os testes passando (nenhum regressão).

- [ ] **Step 6: Build**

```bash
cd client && npm run build
```
Expected: `✓ built`.

- [ ] **Step 7: Commit**

```bash
git add client/src/utils/backgroundHelpers.ts client/src/utils/backgroundHelpers.test.ts
git commit -m "feat(utils): buildBgStyle e sectionSettingsToBgConfig com testes"
```

---

## Task 3: Componente `BackgroundPicker` + CSS

**Files:**
- Create: `client/src/components/StyleControls/BackgroundPicker.tsx`
- Modify: `client/src/components/StyleControls/index.ts`
- Modify: `client/src/App.css` (adicionar ao final da seção PAGE BUILDER V2)

**Interfaces:**
- Consumes: `BackgroundConfig` de `@/utils/backgroundHelpers`; `SegmentedControl` de `@/components/SegmentedControl`; `ColorSwatchPicker`, `RangeRow` de `./`; `ImagePickerModal` de `@/components/ImagePickerModal`
- Produces: `<BackgroundPicker value={BackgroundConfig} onChange={(v: BackgroundConfig) => void} />`

- [ ] **Step 1: Criar `client/src/components/StyleControls/BackgroundPicker.tsx`**

```typescript
import { useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { RangeRow } from './RangeRow';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

export function BackgroundPicker({
  value,
  onChange
}: {
  value: BackgroundConfig;
  onChange: (v: BackgroundConfig) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mode = value.mode;

  return (
    <div className="background-picker">
      <SegmentedControl<'none' | 'color' | 'image'>
        block
        ariaLabel="Modo de fundo"
        value={mode}
        options={[
          { value: 'none', label: 'Nenhum' },
          { value: 'color', label: 'Cor' },
          { value: 'image', label: 'Imagem' }
        ]}
        onChange={(m) => {
          if (m === 'none') onChange({ mode: 'none' });
          else if (m === 'color') onChange({ mode: 'color', color: value.color });
          else onChange({ mode: 'image', image: value.image });
        }}
      />

      {mode === 'color' && (
        <div className="background-picker-section">
          <ColorSwatchPicker
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
        </div>
      )}

      {mode === 'image' && (
        <div className="background-picker-section">
          <button
            type="button"
            className="background-picker-preview"
            onClick={() => setPickerOpen(true)}
            aria-label={value.image?.url ? 'Alterar imagem de fundo' : 'Selecionar imagem de fundo'}
          >
            {value.image?.url ? (
              <img src={value.image.url} alt="" className="background-picker-thumb" />
            ) : (
              <span className="background-picker-empty">Nenhuma imagem</span>
            )}
            <span className="background-picker-change-label">
              {value.image?.url ? 'Alterar imagem' : 'Selecionar imagem'}
            </span>
          </button>

          {value.image?.url && (
            <>
              <div className="inspector-field" style={{ marginTop: '0.75rem' }}>
                <label className="inspector-label">Sobreposição</label>
                <SegmentedControl<'dark' | 'light'>
                  block
                  ariaLabel="Cor da sobreposição"
                  value={value.image.overlayColor ?? 'dark'}
                  options={[
                    { value: 'dark', label: 'Escura' },
                    { value: 'light', label: 'Clara' }
                  ]}
                  onChange={(overlayColor) =>
                    onChange({ ...value, image: { ...value.image!, overlayColor } })
                  }
                />
              </div>
              <RangeRow
                label="Opacidade da sobreposição"
                value={value.image.overlayOpacity ?? 0}
                min={0}
                max={80}
                step={5}
                unit="%"
                onChange={(overlayOpacity) =>
                  onChange({ ...value, image: { ...value.image!, overlayOpacity } })
                }
              />
            </>
          )}
        </div>
      )}

      <ImagePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={({ mediaId, src }) => {
          onChange({
            ...value,
            mode: 'image',
            image: {
              mediaId,
              url: src,
              overlayOpacity: value.image?.overlayOpacity ?? 0,
              overlayColor: value.image?.overlayColor ?? 'dark'
            }
          });
          setPickerOpen(false);
        }}
        currentMediaId={value.image?.mediaId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Exportar `BackgroundPicker` em `client/src/components/StyleControls/index.ts`**

Adicionar ao final do arquivo:

```typescript
export { BackgroundPicker } from './BackgroundPicker';
export type { BackgroundConfig } from '@/utils/backgroundHelpers';
```

- [ ] **Step 3: Adicionar CSS ao final da seção PAGE BUILDER V2 em `client/src/App.css`**

Localizar `/* ----- StyleControls (T4.1) ----- */` e adicionar APÓS o bloco `.range-row-input`:

```css
/* ----- BackgroundPicker ----- */
.background-picker { display: flex; flex-direction: column; gap: 0.75rem; }
.background-picker-section { padding-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }

.background-picker-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 2px solid var(--color-lines);
  border-radius: 10px;
  background: var(--color-shell);
  cursor: pointer;
  transition: border-color 150ms ease;
  width: 100%;
  text-align: left;
}
.background-picker-preview:hover { border-color: var(--color-forest); }

.background-picker-thumb {
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.background-picker-empty {
  width: 56px;
  height: 40px;
  border-radius: 6px;
  background: var(--color-lines);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--color-forest);
}

.background-picker-change-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-forest);
}

/* block-bg-wrapper: envolve blocos com fundo no renderer público e canvas */
.block-bg-wrapper {
  position: relative;
  border-radius: inherit;
  overflow: hidden;
}
```

- [ ] **Step 4: Build**

```bash
cd client && npm run build
```
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StyleControls/BackgroundPicker.tsx client/src/components/StyleControls/index.ts client/src/App.css
git commit -m "feat(ui): componente BackgroundPicker (T4.1 — modo cor/imagem/nenhum)"
```

---

## Task 4: `SectionSettingsPanel` — substituir presets por `BackgroundPicker`

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/components/SectionSettingsPanel.tsx`

**Interfaces:**
- Consumes: `BackgroundPicker` de `@/components/StyleControls`; `sectionSettingsToBgConfig` de `@/utils/backgroundHelpers`; `BackgroundConfig` de `@/utils/backgroundHelpers`
- O prop `onChangeSectionBackground` (preset) deixa de ser necessário — verificar se ainda é chamado em `index.tsx` ou `useSectionManager.ts` e remover se for o caso

- [ ] **Step 1: Reescrever `SectionSettingsPanel.tsx`**

O arquivo completo ficará assim:

```typescript
import type { PageSection } from '@/types';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BackgroundPicker } from '@/components/StyleControls';
import { sectionSettingsToBgConfig } from '@/utils/backgroundHelpers';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

type Columns = 1 | 2 | 3;
type Padding = 'normal' | 'compact' | 'large';
type MaxWidth = 'normal' | 'wide';
type Height = 'normal' | 'tall';

export function SectionSettingsPanel(_props: {
  section: PageSection;
  onChangeSectionColumns: (columns: Columns) => void;
  onChangeSectionPadding: (padding: Padding) => void;
  onChangeSectionMaxWidth: (maxWidth: MaxWidth) => void;
  onChangeSectionHeight: (height: Height) => void;
  onUpdateSettings: (patch: Partial<NonNullable<PageSection['settings']>>) => void;
}) {
  const {
    section,
    onChangeSectionColumns,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight,
    onUpdateSettings
  } = _props;

  const padding = (section.settings?.padding || 'normal') as Padding;
  const maxWidth = (section.settings?.maxWidth || 'normal') as MaxWidth;
  const height = (section.settings?.height || 'normal') as Height;
  const columnsCount = getSectionColumnCount(section);
  const name = section.settings?.name ?? '';
  const anchorId = section.settings?.anchorId ?? '';
  const columnGap = (section.settings?.columnGap ?? 'md') as 'sm' | 'md' | 'lg';
  const verticalAlign = (section.settings?.verticalAlign ?? 'top') as 'top' | 'center' | 'bottom';
  const isHero = section.kind === 'hero';

  const bgConfig: BackgroundConfig = sectionSettingsToBgConfig(section.settings ?? {});

  const handleBgChange = (bg: BackgroundConfig) => {
    onUpdateSettings({
      backgroundMode: bg.mode,
      backgroundColor: bg.color,
      backgroundImage: bg.image
    });
  };

  if (isHero) {
    return (
      <div className="section-settings-panel">
        <h3 className="inspector-section-title">Configurações da Seção</h3>
        <p className="inspector-hint">
          A seção Hero é fixa e não pode ser reconfigurada por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="section-settings-panel">
      <h3 className="inspector-section-title">Configurações da Seção</h3>

      <div className="inspector-field">
        <label className="inspector-label">Colunas</label>
        <SegmentedControl<string>
          block
          ariaLabel="Colunas"
          value={String(columnsCount)}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' }
          ]}
          onChange={(v) => onChangeSectionColumns(Number(v) as Columns)}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Fundo</label>
        <BackgroundPicker value={bgConfig} onChange={handleBgChange} />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Espaçamento</label>
        <SegmentedControl<Padding>
          block
          ariaLabel="Espaçamento"
          value={padding}
          options={[
            { value: 'compact', label: 'Compacto' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Generoso' }
          ]}
          onChange={onChangeSectionPadding}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Altura</label>
        <SegmentedControl<Height>
          block
          ariaLabel="Altura"
          value={height}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'tall', label: 'Alta' }
          ]}
          onChange={onChangeSectionHeight}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Largura máxima</label>
        <SegmentedControl<MaxWidth>
          block
          ariaLabel="Largura máxima"
          value={maxWidth}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Largo' }
          ]}
          onChange={onChangeSectionMaxWidth}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Nome da seção (interno)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onUpdateSettings({ name: e.target.value })}
          placeholder="Ex: Sobre, Serviços..."
        />
        <p className="inspector-hint">Aparece só no editor e no organizador, não no site.</p>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Espaço entre colunas</label>
        <SegmentedControl<'sm' | 'md' | 'lg'>
          block
          ariaLabel="Espaço entre colunas"
          value={columnGap}
          options={[
            { value: 'sm', label: 'Pequeno' },
            { value: 'md', label: 'Médio' },
            { value: 'lg', label: 'Grande' }
          ]}
          onChange={(v) => onUpdateSettings({ columnGap: v })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Alinhamento vertical</label>
        <SegmentedControl<'top' | 'center' | 'bottom'>
          block
          ariaLabel="Alinhamento vertical"
          value={verticalAlign}
          options={[
            { value: 'top', label: 'Topo' },
            { value: 'center', label: 'Centro' },
            { value: 'bottom', label: 'Base' }
          ]}
          onChange={(v) => onUpdateSettings({ verticalAlign: v })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Âncora (id para links)</label>
        <input
          type="text"
          value={anchorId}
          onChange={(e) =>
            onUpdateSettings({ anchorId: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })
          }
          placeholder="ex: sobre"
        />
        <p className="inspector-hint">Permite link direto até esta seção: /p/slug#ancora</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remover `onChangeSectionBackground` do caller em `index.tsx`**

Abrir `client/src/pages/AdminPageEditorPage/index.tsx`. Localizar onde `SectionSettingsPanel` é renderizado (dentro do `EditorDrawer`) e remover o prop `onChangeSectionBackground`:

```tsx
// REMOVER esta linha do <SectionSettingsPanel>:
onChangeSectionBackground={(bg) => sections.handleChangeSectionBackground(selection.sectionId, bg)}
```

- [ ] **Step 3: Build**

```bash
cd client && npm run build
```

Se o build reclamar de `handleChangeSectionBackground` não usada em `useSectionManager.ts`, isso é aceitável — não remover o handler para não quebrar possíveis usos futuros. O TypeScript só reclama de props ausentes, não de métodos não chamados.

Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AdminPageEditorPage/components/SectionSettingsPanel.tsx client/src/pages/AdminPageEditorPage/index.tsx
git commit -m "feat(editor): SectionSettingsPanel usa BackgroundPicker em vez de presets"
```

---

## Task 5: Fundo de bloco — `useBlockManager` + `BlockInspector` + `index.tsx`

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/hooks/useBlockManager.ts`
- Modify: `client/src/pages/AdminPageEditorPage/components/BlockInspector.tsx`
- Modify: `client/src/pages/AdminPageEditorPage/index.tsx`

**Interfaces:**
- Consumes: `BackgroundConfig` de `@/utils/backgroundHelpers`; `BackgroundPicker` de `@/components/StyleControls`
- Produces: `handleUpdateBlockBackground(sectionId, colIndex, blockId, bg)` em `useBlockManager`; prop `onChangeBlockBackground` em `BlockInspector`

- [ ] **Step 1: Adicionar `handleUpdateBlockBackground` a `useBlockManager.ts`**

Localizar o `return { ... }` no final do hook (antes dos `}`). Adicionar após `handleUpdateBlockData`:

```typescript
const handleUpdateBlockBackground = (
  sectionId: string,
  columnIndex: number,
  blockId: string,
  blockBackground: import('@/utils/backgroundHelpers').BackgroundConfig
) => {
  setPage((prev) => ({
    ...prev,
    layout: {
      ...prev.layout,
      sections: prev.layout.sections.map((sec) =>
        sec.id !== sectionId
          ? sec
          : {
              ...sec,
              cols: sec.cols.map((col, idx) =>
                idx !== columnIndex
                  ? col
                  : {
                      ...col,
                      blocks: col.blocks.map((b) =>
                        b.id !== blockId
                          ? b
                          : { ...b, blockBackground, updatedAt: new Date().toISOString() }
                      )
                    }
              )
            }
      )
    }
  }));
};
```

E adicionar ao objeto de retorno: `handleUpdateBlockBackground`.

- [ ] **Step 2: Adicionar `onChangeBlockBackground` ao `BlockInspector.tsx`**

Localizar os props atuais do componente:
```typescript
export function BlockInspector(_props: {
  block: PageBlock;
  columnCount: number;
  onChangeData: (data: PageBlock['data']) => void;
  onChangeColSpan: (colSpan: number) => void;
  onUploadingChange?: (uploading: boolean) => void;
})
```

Atualizar para:
```typescript
import { BackgroundPicker } from '@/components/StyleControls';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

export function BlockInspector(_props: {
  block: PageBlock;
  columnCount: number;
  onChangeData: (data: PageBlock['data']) => void;
  onChangeColSpan: (colSpan: number) => void;
  onChangeBlockBackground: (bg: BackgroundConfig) => void;
  onUploadingChange?: (uploading: boolean) => void;
})
```

Adicionar `onChangeBlockBackground` à desestruturação e, ao final do JSX (antes do `</div>` que fecha `.block-inspector`), adicionar:

```tsx
<div className="inspector-field">
  <label className="inspector-label">Fundo do bloco</label>
  <BackgroundPicker
    value={block.blockBackground ?? { mode: 'none' }}
    onChange={onChangeBlockBackground}
  />
</div>
```

- [ ] **Step 3: Passar `onChangeBlockBackground` no `index.tsx`**

Localizar o trecho onde `BlockInspector` é renderizado dentro do `EditorDrawer` (buscar `<BlockInspector`). Adicionar o prop:

```tsx
<BlockInspector
  block={block}
  columnCount={sectionColumnCount}
  onChangeData={(data) =>
    blocks.handleUpdateBlockData(selection.sectionId, selection.columnIndex, selection.blockId, data)
  }
  onChangeColSpan={(span) =>
    blocks.handleUpdateBlockData(
      selection.sectionId,
      selection.columnIndex,
      selection.blockId,
      block.data,
      span
    )
  }
  onChangeBlockBackground={(bg) =>
    blocks.handleUpdateBlockBackground(selection.sectionId, selection.columnIndex, selection.blockId, bg)
  }
  onUploadingChange={blocks.setHasUploading}
/>
```

- [ ] **Step 4: Build e testes**

```bash
cd client && npm run build && npx vitest run
```
Expected: `✓ built`, todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AdminPageEditorPage/hooks/useBlockManager.ts client/src/pages/AdminPageEditorPage/components/BlockInspector.tsx client/src/pages/AdminPageEditorPage/index.tsx
git commit -m "feat(editor): fundo de bloco — BlockInspector + useBlockManager + wiring"
```

---

## Task 6: Renderer público — `PageRenderer.tsx`

**Files:**
- Modify: `client/src/components/PageRenderer.tsx`

**Interfaces:**
- Consumes: `buildBgStyle`, `sectionSettingsToBgConfig` de `@/utils/backgroundHelpers`

- [ ] **Step 1: Atualizar `SectionRenderer` para o novo sistema de fundo**

Localizar `function SectionRenderer(...)` em `PageRenderer.tsx`. Substituir o bloco de cálculo de `backgroundClass` e `sectionStyle` (atualmente linhas 107-130 aprox.) pelo seguinte:

```typescript
import { buildBgStyle, sectionSettingsToBgConfig } from '@/utils/backgroundHelpers';
// (adicionar ao bloco de imports no topo do arquivo)
```

Dentro de `SectionRenderer`, substituir:
```typescript
// REMOVER:
const background = (settings.backgroundStyle as string) || (settings.background as string) || 'none';
const backgroundClass = background === 'soft' ? 'section-bg-soft' : ...;
const sectionStyle = settings.backgroundColor ? { background: settings.backgroundColor } : undefined;
```

Por:
```typescript
// Novo sistema: se backgroundMode está definido, usa buildBgStyle.
// Caso contrário, cai no sistema legado de classes (retrocompatibilidade).
const hasNewBgSystem = !!settings.backgroundMode;
const bgConfig = sectionSettingsToBgConfig(settings);
const { wrapperStyle: newBgStyle, overlayStyle: sectionOverlay } = buildBgStyle(bgConfig);

// Legado: presets soft/dark/earthy
const legacyBackground = (settings.backgroundStyle as string) || (settings.background as string) || 'none';
const legacyBgClass = !hasNewBgSystem
  ? (legacyBackground === 'soft' ? 'section-bg-soft'
    : legacyBackground === 'dark' ? 'section-bg-dark'
    : legacyBackground === 'earthy' ? 'section-bg-earthy'
    : 'section-bg-none')
  : '';

const sectionStyle = hasNewBgSystem ? newBgStyle : undefined;
```

Alterar `backgroundClass` nos usos para `legacyBgClass`, e atualizar `shouldApplyContainer`:
```typescript
const shouldApplyContainer = !hasNewBgSystem &&
  (legacyBackground === 'soft' || legacyBackground === 'dark' || legacyBackground === 'earthy') && !hasHero;
```

Atualizar o JSX para adicionar o overlay e `position: relative` no container quando há imagem:
```tsx
return (
  <section
    id={settings.anchorId || undefined}
    className={`page-public-section ${legacyBgClass} ${paddingClass} ${maxWidthClass} ${heightClass}`.trim()}
    data-section-index={sectionIndex}
    style={sectionStyle}
  >
    {sectionOverlay && <div style={sectionOverlay} aria-hidden />}
    <div
      className={containerClass}
      style={sectionOverlay ? { position: 'relative', zIndex: 1 } : undefined}
    >
      <div
        className={`page-public-grid ${sectionContainerClass} cols-${effectiveColumns}`.trim()}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
          gap: columnGapValue,
          alignItems: verticalAlignValue,
          gridAutoRows: 'auto'
        }}
      >
        {blockPositions.map((pos) => {
          if (!isRenderableBlock(pos.block)) return null;
          return (
            <div
              key={pos.block.id}
              className="page-public-block"
              style={{
                gridColumn: `${pos.colStart} / span ${pos.colSpan}`,
                gridRow: `${pos.rowStart} / span ${pos.rowSpan}`
              }}
            >
              <PageBlockView block={pos.block} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
```

- [ ] **Step 2: Atualizar `PageBlockView` para aplicar fundo de bloco**

Localizar `export function PageBlockView(...)`. Substituir o conteúdo pelo seguinte (mantendo toda a lógica interna do renderer):

```typescript
import { buildBgStyle } from '@/utils/backgroundHelpers';
// (adicionar ao bloco de imports no topo — já deve estar lá do step anterior)

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
      <BlockErrorBoundary blockId={childBlock.id} blockType={childBlock.type}>
        <ChildRenderer
          data={childBlock.data}
          blockId={childBlock.id}
          pageSlug={pageSlug}
          enableFormSubmit={enableFormSubmit}
        />
      </BlockErrorBoundary>
    );
  };

  const blockContent = (
    <BlockErrorBoundary blockId={block.id} blockType={block.type}>
      <Renderer
        data={block.data}
        blockId={block.id}
        pageSlug={pageSlug}
        enableFormSubmit={enableFormSubmit}
        renderChild={renderChild}
      />
    </BlockErrorBoundary>
  );

  const bg = block.blockBackground;
  if (bg && (bg.mode === 'color' || bg.mode === 'image')) {
    const { wrapperStyle, overlayStyle } = buildBgStyle(bg);
    return (
      <div className="block-bg-wrapper" style={wrapperStyle}>
        {overlayStyle && <div style={overlayStyle} aria-hidden />}
        <div style={{ position: 'relative', zIndex: 1 }}>{blockContent}</div>
      </div>
    );
  }

  return blockContent;
}
```

- [ ] **Step 3: Build**

```bash
cd client && npm run build
```
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/PageRenderer.tsx
git commit -m "feat(renderer): SectionRenderer e PageBlockView aplicam novo sistema de fundo"
```

---

## Task 7: Canvas do editor — `SectionEditor` + `EditableBlock`

**Files:**
- Modify: `client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx`
- Modify: `client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx`

**Interfaces:**
- Consumes: `buildBgStyle`, `sectionSettingsToBgConfig` de `@/utils/backgroundHelpers`

- [ ] **Step 1: Atualizar `SectionEditor.tsx` para mostrar fundo ao vivo no canvas**

Adicionar import no topo:
```typescript
import { buildBgStyle, sectionSettingsToBgConfig } from '@/utils/backgroundHelpers';
```

Localizar o bloco de variáveis no início do componente (após `const columnsCount = ...`):
```typescript
// REMOVER:
const background = (section.settings?.backgroundStyle || section.settings?.background || 'none') as ...;
const customBg = section.settings?.backgroundColor;
```

Substituir por:
```typescript
const bgConfig = sectionSettingsToBgConfig(section.settings ?? {});
const { wrapperStyle: sectionBgStyle, overlayStyle: sectionBgOverlay } = buildBgStyle(bgConfig);

// Legado: se não há novo sistema, usa data-bg para as classes CSS existentes
const hasNewBgSystem = !!section.settings?.backgroundMode;
const legacyBg = hasNewBgSystem
  ? undefined
  : (section.settings?.backgroundStyle || section.settings?.background || 'none');
```

Atualizar o `<div>` raiz do retorno:
```tsx
return (
  <div
    id={`editor-section-${section.id}`}
    className={`page-section-editor admin-card${isSectionHidden ? ' is-hidden' : ''}`}
    style={{
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'visible',
      ...sectionBgStyle
    }}
    data-bg={legacyBg}
  >
    {sectionBgOverlay && (
      <div style={{ ...sectionBgOverlay, borderRadius: 'inherit', overflow: 'hidden' }} aria-hidden />
    )}
    <div style={{ position: 'relative', zIndex: sectionBgOverlay ? 1 : undefined }}>
      <SectionToolbar ... />
      <DndContext ...>
        {/* conteúdo existente inalterado */}
      </DndContext>
      <ConfirmModal ... />
    </div>
  </div>
);
```

**Atenção:** O `<SectionToolbar>`, `<DndContext>` e `<ConfirmModal>` devem ser envolvidos no `<div style={{ position: 'relative', ... }}>` apenas quando `sectionBgOverlay` existir. Para simplificar, envolver sempre (sem custo perceptível):

```tsx
return (
  <div
    id={`editor-section-${section.id}`}
    className={`page-section-editor admin-card${isSectionHidden ? ' is-hidden' : ''}`}
    style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'visible', ...sectionBgStyle }}
    data-bg={legacyBg}
  >
    {sectionBgOverlay && <div style={{ ...sectionBgOverlay, zIndex: 0 }} aria-hidden />}
    <SectionToolbar ... />
    <DndContext ...>
      { /* colunas e blocos */ }
    </DndContext>
    <ConfirmModal ... />
  </div>
);
```

O zIndex do overlay em 0 garante que ele fica abaixo do toolbar e do conteúdo (que não têm z-index definido explicitamente e ficam por cima no stacking context natural).

- [ ] **Step 2: Atualizar `EditableBlock.tsx` para mostrar fundo do bloco no canvas**

Adicionar import no topo:
```typescript
import { buildBgStyle } from '@/utils/backgroundHelpers';
```

Localizar o `return (` do componente. Antes do `return`, adicionar:

```typescript
const bg = block.blockBackground;
const hasBg = bg && (bg.mode === 'color' || bg.mode === 'image');
const { wrapperStyle: blockBgStyle, overlayStyle: blockBgOverlay } = hasBg
  ? buildBgStyle(bg)
  : { wrapperStyle: {}, overlayStyle: undefined };
```

Localizar `<div className="editable-block-body">` e atualizar para:

```tsx
<div className="editable-block-body" style={blockBgStyle}>
  {blockBgOverlay && <div style={{ ...blockBgOverlay, zIndex: 0 }} aria-hidden />}
  <PageBlockView block={block} enableFormSubmit={false} />
</div>
```

- [ ] **Step 3: Build e testes completos**

```bash
cd client && npm run build && npx vitest run
```
Expected: `✓ built`, todos os testes passando.

- [ ] **Step 4: Commit final**

```bash
git add client/src/pages/AdminPageEditorPage/components/SectionEditor.tsx client/src/pages/AdminPageEditorPage/components/EditableBlock.tsx
git commit -m "feat(canvas): SectionEditor e EditableBlock refletem fundo ao vivo no editor"
```
