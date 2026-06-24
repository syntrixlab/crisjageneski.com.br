# Spec — BackgroundPicker: fundos de seção e bloco

**Data:** 2026-06-24
**Status:** aprovado

---

## Resumo

Substituir o sistema de presets de fundo de seção (`none/soft/dark/earthy`) por um seletor de 3 modos: **Nenhum**, **Cor sólida** e **Imagem**. O mesmo sistema se aplica a blocos individuais. Um único componente `BackgroundPicker` é compartilhado entre `SectionSettingsPanel` e `BlockInspector`.

---

## Escopo

- **Seções:** os 3 modos substituem o campo `background` (preset) e o `backgroundColor` separado.
- **Blocos:** todos os 16 tipos ganham o mesmo sistema via novo campo `blockBackground` no topo do union `PageBlock`.
- **Presets legados** (`soft/dark/earthy`): mantidos no tipo e no renderer público por retrocompatibilidade; não editáveis pela nova UI. Ao editar uma seção e salvar com o novo sistema, o preset antigo é sobrescrito.

---

## Modelo de dados

### Seção — extensão de `PageSection['settings']`

```typescript
// client/src/types/layout.ts
settings?: {
  // --- campos existentes mantidos ---
  background?: 'none' | 'soft' | 'dark' | 'earthy'   // legado, não editável pela nova UI
  backgroundColor?: string                              // legado, absorvido pelo novo sistema
  padding?: 'normal' | 'compact' | 'large'
  height?: 'normal' | 'tall'
  maxWidth?: 'normal' | 'wide'
  hidden?: boolean
  name?: string
  anchorId?: string
  columnGap?: 'sm' | 'md' | 'lg'
  verticalAlign?: 'top' | 'center' | 'bottom'
  columnsLayout?: 2 | 3

  // --- campos novos ---
  backgroundMode?: 'none' | 'color' | 'image'
  backgroundImage?: {
    mediaId: string
    url: string
    overlayOpacity?: number        // 0–80, default 0
    overlayColor?: 'dark' | 'light' // default 'dark'
  }
  // backgroundColor já existente reutilizado para mode='color'
}
```

### Bloco — novo campo no union `PageBlock`

```typescript
// client/src/types/blocks.ts — adicionado a todos os 16 variants
blockBackground?: {
  mode: 'none' | 'color' | 'image'
  color?: string
  image?: {
    mediaId: string
    url: string
    overlayOpacity?: number
    overlayColor?: 'dark' | 'light'
  }
}
```

`blockBackground` (e não `background`) evita conflito com o campo `background` que existe no `data` de alguns blocos (`hero`, `cta`).

---

## Componente BackgroundPicker

**Localização:** `client/src/components/StyleControls/BackgroundPicker.tsx`
**Exportado via:** `client/src/components/StyleControls/index.ts`

### Tipos

```typescript
export type BackgroundConfig = {
  mode: 'none' | 'color' | 'image'
  color?: string
  image?: {
    mediaId: string
    url: string
    overlayOpacity?: number
    overlayColor?: 'dark' | 'light'
  }
}

export type BackgroundPickerProps = {
  value: BackgroundConfig
  onChange: (v: BackgroundConfig) => void
  context?: 'section' | 'block'   // default 'section'
}
```

### Comportamento

1. `SegmentedControl` com 3 opções: **Nenhum / Cor / Imagem**
2. Ao selecionar **Cor**: exibe `ColorSwatchPicker` (já existente). `onChange` emite `{ mode: 'color', color: '#hex' }`.
3. Ao selecionar **Imagem**:
   - Thumbnail da imagem atual (ou placeholder) + botão "Alterar imagem" que abre `ImagePickerModal` com `enableCrop={false}` (o usuário enquadra o que quiser, sem ratio forçado).
   - `SegmentedControl` Escuro / Claro para `overlayColor`.
   - `RangeRow` de opacidade (0–80, step 5, unidade `%`) para `overlayOpacity`.
   - `onChange` emite `{ mode: 'image', image: { mediaId, url, overlayOpacity, overlayColor } }`.
4. Ao selecionar **Nenhum**: `onChange` emite `{ mode: 'none' }`, limpando cor e imagem.

O campo `context` é reservado para diferenciação futura; no MVP ambos os contextos têm o mesmo comportamento.

---

## Integração nos painéis

### SectionSettingsPanel

- Remove os campos **Fundo** (SegmentedControl de presets) e **Cor de fundo personalizada** (ColorSwatchPicker).
- Adiciona `<BackgroundPicker>` no lugar, derivando `BackgroundConfig` a partir dos campos do settings:
  ```typescript
  const bgConfig: BackgroundConfig = settings.backgroundMode
    ? { mode: settings.backgroundMode, color: settings.backgroundColor, image: settings.backgroundImage }
    : { mode: 'none' }   // preset legado não é editado; usuário escolhe novo modo ao editar
  ```
- `onChange` chama `onUpdateSettings({ backgroundMode, backgroundColor, backgroundImage })`.

### BlockInspector

- Adiciona seção "Fundo do bloco" com `<BackgroundPicker>` após os controles existentes.
- `onChange` chama `onChangeBlockBackground(blockBackground)`.
- `onChangeBlockBackground` novo prop (ou integrado ao `onChangeData` se possível sem poluir o `data` de cada bloco — preferir prop separado).

### useBlockManager

- `handleUpdateBlockBackground(sectionId, colIndex, blockId, bg: BackgroundConfig)` — atualiza `block.blockBackground` no layout.

---

## Renderização pública

### SectionRenderer (PageRenderer.tsx)

Função auxiliar `buildSectionBgStyle(settings)` retorna `{ sectionStyle, overlayStyle }`:

```
Se backgroundMode === 'color' e backgroundColor:
  sectionStyle.background = backgroundColor

Se backgroundMode === 'image' e backgroundImage.url:
  sectionStyle.backgroundImage = `url(${url})`
  sectionStyle.backgroundSize = 'cover'
  sectionStyle.backgroundPosition = 'center'
  overlayStyle = {
    position: 'absolute', inset: 0,
    background: overlayColor === 'light'
      ? `rgba(255,255,255, ${opacity/100})`
      : `rgba(0,0,0, ${opacity/100})`,
    pointerEvents: 'none'
  }

Se backgroundMode === 'none' ou ausente:
  Sem estilo inline. Se `background` legado presente → mantém classe section-bg-* atual.
```

O `SectionRenderer` precisa de `position: relative` para o overlay absoluto funcionar.

### PageBlockView (PageRenderer.tsx)

Se `block.blockBackground?.mode` for `'color'` ou `'image'`, envolve o renderer num:

```tsx
<div className="block-bg-wrapper" style={blockBgStyle}>
  {overlayStyle && <div style={overlayStyle} aria-hidden />}
  <div style={{ position: 'relative', zIndex: 1 }}>
    {/* renderer do bloco */}
  </div>
</div>
```

Modo `'none'` ou campo ausente → sem wrapper (zero impacto em blocos existentes).

---

## Editor canvas (SectionEditor / EditableBlock)

O canvas do editor deve refletir o fundo ao vivo:

- **SectionEditor:** aplica `buildSectionBgStyle` ao container da seção, igual ao público.
- **EditableBlock:** aplica `block.blockBackground` ao wrapper do bloco no canvas.

---

## Migração de dados

Sem migration de banco. Estratégia de retrocompatibilidade:

| Dado existente | Comportamento |
|---|---|
| `background: 'soft'` sem `backgroundMode` | Renderer público mantém `section-bg-soft`; editor não mostra seleção ativa |
| `backgroundColor: '#hex'` sem `backgroundMode` | Renderer público ignora (campo legado); editor mostra `mode: 'none'` — usuário redefine |
| Sem nenhum campo de fundo | Sem fundo — comportamento atual mantido |

Ao salvar com o novo sistema, `backgroundMode` é escrito e o preset legado deixa de ter efeito.

---

## CSS (App.css — seção PAGE BUILDER V2)

Novos seletores a adicionar:

```css
.block-bg-wrapper { position: relative; border-radius: inherit; overflow: hidden; }
.background-picker-preview { ... }  /* thumbnail da imagem selecionada no inspector */
```

As classes `section-bg-*` públicas permanecem intactas.

---

## Fora de escopo (esta entrega)

- Parallax ou `background-attachment: fixed`
- Múltiplas imagens / gradientes
- Posicionamento customizado da imagem (top/center/bottom) — fixo em `center`
- Ratio obrigatório no crop de fundo (usuário escolhe livremente no ImagePickerModal)
