# Especificação — Redesign do Page Builder

**Data:** 2026-06-19  
**Status:** Proposta — aguardando aprovação  
**Escopo:** `client/src/pages/AdminPageEditorPage/` e CSS relacionado em `App.css`  
**Companion:** [`2026-06-19-blocks-redesign.md`](./2026-06-19-blocks-redesign.md) — redesign do sistema de blocos (Fase 8)

---

## 1. Diagnóstico: o que está errado hoje

### 1.1 Poluição visual no cabeçalho de seção

O `SectionEditor` empilha **cinco grupos de botões-toggle** enfileirados num único `<div>` horizontal com `flexWrap: wrap`. Numa tela de 1280px, a linha 1 vira 2–3 linhas. O usuário não sabe o que cada grupo controla sem ler o tooltip.

```
Secao 1 | Colunas [1 col][2 cols][3 cols] | [Sem fundo][Suave][Escuro][Terroso] | [Compacto][Normal] | [Altura Normal][Altura Alta] | [Normal][Largo]  ↑ ↓ 🗑
```

Problemas específicos:
- Nenhum label de categoria visível (só tooltip `title`), quebrando princípio de affordance.
- Grupos com nomes ambíguos: "Normal" aparece 3x em grupos diferentes (padding, altura, largura).
- `onChangeSectionColumns` aceita `1 | 2 | 3`, mas o código exibe opções `[2, 3]` quando `section.columns !== 1` — o toggle de 1 col some para seções já existentes com 2+ colunas, impossibilitando reduzir.
- Esconde-se o hero com `if (!isHeroSection)` em cada condição → 5x duplicação de guarda.

### 1.2 BlockCard: 7 ações expostas num cabeçalho minúsculo

Cada bloco expõe: ↑ ↓ ✏️ 🌐 ➕ 📋 🗑 — 7 ícones side-by-side em 40–48px de altura. Em colunas de 33% de largura, os ícones se sobrepõem. Não há hierarquia — todas as ações têm o mesmo peso visual.

### 1.3 Ausência de feedback de estado de seção

O usuário não sabe qual configuração está ativa sem olhar qual botão está preenchido de verde escuro. Não há preview inline de como a seção vai aparecer.

### 1.4 "Adicionar seção" exposto só embaixo da canvas

O botão "+ Adicionar seção" fica no rodapé do canvas, fora da viewport para páginas longas. Não existe atalho para inserir seção *entre* duas existentes.

### 1.5 Modal de seleção de tipo de bloco: texto plano sem ícone/preview

15 blocos listados como cards texto, sem ícones, sem thumbnail, sem categorização. O usuário precisa ler a descrição de todos para decidir.

### 1.6 Barra de toolbar comprimida

A toolbar topo inclui: Voltar · Badge status · [Edição][Preview] · mensagem de alerta · Salvar rascunho · Publicar · Ver site — tudo numa linha. Em telas <1100px os botões somem.

### 1.7 Painel lateral (configurações da página) sempre visível

O painel de configurações (título, slug, descrição) ocupa `~280px` fixos à direita **sempre**, mesmo no modo Preview. É espaço desperdiçado e empurra a canvas para a esquerda.

### 1.8 Bugs técnicos observados no código

| Arquivo | Problema |
|---|---|
| `useSectionManager.ts` | `handleChangeSectionBackground` salva `background` e `backgroundStyle` ao mesmo tempo — legado duplicado que o renderer resolve com fallback em cadeia |
| `useSectionManager.ts` | Mesma duplicação em `padding`/`density` e `maxWidth`/`width` |
| `SectionEditor.tsx` | `columnOptions = section.columns === 1 ? [1, 2, 3] : [2, 3]` — não permite voltar para 1 col |
| `BlockEditorModal.tsx` | Validação de 10 tipos inline no mesmo `handleSave` (~120 linhas). Difícil manter e testar |
| `index.tsx` | `columnCount` calculado com 3 fallbacks encadeados (`settings.columnsLayout \|\| columnsLayout \|\| columns \|\| 2`) — sinal de schema sujo |

---

## 2. Proposta de redesign da UX

### 2.1 Princípio geral

> O editor deve ser **invisível quando não em uso**. Controles aparecem com hover/foco, não em layout permanente.

### 2.2 Layout da tela

```
┌─────────────────────────────────────────────────┐
│  TOPBAR: [← Voltar] [status] · [Edição|Preview] │  ← sticky, slim (48px)
│                                [Salvar] [Publicar]│
├─────────────────────────────────────────────────┤
│                                                   │
│   CANVAS (width: 100% - 0px, max 900px centered) │
│                                                   │
│   ┌─── Seção 1 ────────────────────────────────┐ │
│   │  [hover: toolbar de seção]                 │ │
│   │  Bloco A         │  Bloco B                │ │
│   │  [hover: ações]  │  [hover: ações]         │ │
│   └────────────────────────────────────────────┘ │
│        [+ entre seções — aparece ao hover]        │
│   ┌─── Seção 2 ────────────────────────────────┐ │
│   │  ...                                       │ │
│   └────────────────────────────────────────────┘ │
│   [+ Adicionar seção — sempre visível no fim]     │
│                                                   │
└─────────────────────────────────────────────────┘
│  DRAWER deslizante ← abre ao clicar ⚙️ na seção  │
│  (Configurações de página + Configurações seção)  │
└─────────────────────────────────────────────────┘
```

**Mudanças-chave:**
- Canvas ocupa 100% da largura disponível (sem painel fixo à direita).
- Painel lateral vira um **drawer** lateral ou bottom sheet que abre/fecha.
- Configurações de seção saem do cabeçalho e vão para dentro do drawer ao selecionar uma seção.
- Botão "+ inserir seção entre" aparece ao hover na borda inferior de cada seção.

### 2.3 Toolbar de seção (hover-first)

Ao passar o mouse sobre uma seção, aparece uma faixa de controle **acima** dela:

```
[Secao 2] · ↑ ↓ · ⚙️ Configurar · 📋 Duplicar · 🗑 Remover
```

Clicar em **"⚙️ Configurar"** abre o painel lateral com:

```
CONFIGURAÇÕES DA SEÇÃO
  Colunas         [1] [2] [3]
  Fundo           ○ Nenhum  ○ Suave  ○ Escuro  ○ Terroso
  Espaçamento     ○ Compacto  ● Normal  ○ Generoso
  Altura          ○ Normal  ○ Alta
  Largura máx     ○ Normal  ○ Largo
```

Usar radio buttons com label visível em vez de toggles agrupados.

### 2.4 BlockCard: ações progressivas

**Estado padrão** — bloco renderizado com badge de tipo (pequeno, canto):
```
┌─────────────────────────────────┐
│ [Texto]                         │
│                                 │
│  Psicologia para vidas com...   │
│                                 │
└─────────────────────────────────┘
```

**Estado hover** — faixa de ação aparece no topo:
```
┌─────────────────────────────────┐
│ [Texto]  ↑ ↓  ✏️ Editar  ⋯ ▼   │  ← "⋯" abre dropdown com Duplicar/Mover/Remover
│                                 │
│  Psicologia para vidas com...   │
│                                 │
└─────────────────────────────────┘
```

Hierarquia: Editar é primário. Mover é secundário. Duplicar/Remover ficam no menu "⋯".

### 2.5 Modal de seleção de bloco: categorias + ícones

```
ADICIONAR BLOCO

  Conteúdo          Layout / Destaque     Interação
  ─────────         ─────────────────     ─────────
  📝 Texto          🖼 Hero               📋 Formulário
  🖼️ Imagem         📢 CTA               💬 WhatsApp
  🎴 Cards          ⬛ Media + Texto      🌐 Redes sociais
  💊 Pills          ─────────────────     ─────────────────
  🔘 Botão          Dinâmico
  🔘🔘 Grupo Botões  📰 Posts recentes
  ✨ Elemento       🛠 Serviços
                    📍 Contato
```

### 2.6 Painel de configurações da página (drawer)

Abre ao clicar em "⚙️ Página" na toolbar ou ao não ter seção selecionada:

- Título
- Slug (com botão "Gerar a partir do título")
- Descrição (com contador)
- Status atual + data de publicação

### 2.7 Inserir seção entre

```
┌─── Seção 1 ───────────────────┐
└───────────────────────────────┘
            [+ Seção]             ← aparece ao hover na borda entre seções
┌─── Seção 2 ───────────────────┐
└───────────────────────────────┘
```

`insertAfter: sectionId` passa para o `useSectionManager` → `addSection` precisa de parâmetro de índice.

---

## 3. Bugs técnicos a corrigir na refatoração

1. **Schema sujo**: normalizar `settings` da seção — escolher apenas um campo canônico (`background`, `padding`, `maxWidth`, `height`) e remover aliases. Criar migração de dados via `ensureLayoutV2`.
2. **Impossibilidade de reduzir para 1 coluna**: `columnOptions` deve sempre incluir `[1, 2, 3]`.
3. **Validação em `handleSave`**: extrair para `validateBlockDraft(draft): string | null` puro e testável.
4. **`columnCount` com 3 fallbacks**: consolidar em função `getSectionColumnCount(section)`.

---

## 4. Plano de execução — fases

### Fase 7-A — Limpeza técnica (sem mudança visual) `[Haiku/Codex]`

Escopo pequeno, zero risco de regressão visual.

**Subtarefa A1 — Normalizar aliases de settings da seção**
- Arquivo: `client/src/utils/pageLayoutHelpers.ts`
- Remover gravação dupla `background`+`backgroundStyle`, `padding`+`density`, `maxWidth`+`width` do `useSectionManager`
- Criar função `normalizeSectionSettings(settings)` que converte aliases antigos → canônico durante `ensureLayoutV2`
- Testar: abrir editor, modificar fundo/padding de seção, salvar, reabrir — valor deve persistir

**Subtarefa A2 — Fix columnOptions para permitir voltar a 1 col**
- Arquivo: `SectionEditor.tsx` linha 62
- Mudar: `const columnOptions = [1, 2, 3]` (sempre fixo)
- Testar: seção com 2 cols → clicar "1 col" → deve virar 1 col sem perder blocos (helper `changeSectionColumns` já trata)

**Subtarefa A3 — Extrair validação de bloco**
- Arquivo: `BlockEditorModal.tsx` + novo `client/src/utils/validateBlockDraft.ts`
- Mover os 120 linhas de validação de `handleSave` para `validateBlockDraft(draft, columnCount): string | null`
- `BlockEditorModal` chama `validateBlockDraft` e exibe o retorno
- Sem mudança de comportamento

**Subtarefa A4 — Consolidar getSectionColumnCount**
- Criar `getSectionColumnCount(section: PageSection): number` em `pageLayoutHelpers.ts`
- Substituir os 3 lugares onde aparece a tripla fallback `(section?.settings?.columnsLayout as number) || section?.columnsLayout || section?.columns || 2`

---

### Fase 7-B — Redesign da toolbar de seção `[Codex/Haiku]`

Maior impacto visual, menor risco de lógica.

**Subtarefa B1 — SectionEditor: mover controles para hover overlay**
- Criar componente `SectionToolbar` que renderiza acima da seção no hover
- Mantém os mesmos handlers; apenas muda posicionamento/visibilidade via CSS (`opacity: 0 → 1` on `.page-section-editor:hover`)
- CSS: adicionar classe `.section-toolbar` com `position: absolute; top: -36px; left: 0`
- Remover os 5 grupos de toggle do cabeçalho inline atual

**Subtarefa B2 — SectionSettingsPanel: radio buttons com labels**
- Criar componente `SectionSettingsPanel` com os controles em layout vertical (radio groups)
- Integrar dentro do drawer lateral (ver B4)
- Handlers idênticos aos atuais

**Subtarefa B3 — Inserir seção entre existentes**
- Adicionar parâmetro `insertAfterIndex?: number` para `addSection` em `pageLayoutHelpers.ts`
- `useSectionManager.handleAddSection(insertAfterIndex?)` passa o índice para `addSection`
- `SectionEditor` recebe prop `onInsertAfter: () => void` e exibe botão `[+ Seção]` na borda inferior no hover
- `SectionPresetModal` já funciona sem alteração

**Subtarefa B4 — Drawer lateral**
- Criar componente `EditorDrawer` com `isOpen`, `onClose`, `children`
- Integrar ao `AdminPageEditorPage/index.tsx`
- Estados: `drawerMode: 'page' | 'section' | null` + `selectedSectionId: string | null`
- Ao clicar ⚙️ na seção → `drawerMode = 'section'`, `selectedSectionId = section.id`
- Ao clicar ⚙️ Página na toolbar → `drawerMode = 'page'`
- CSS: `transform: translateX(100%) → translateX(0)` com `transition: 280ms ease`
- Não requer mudança nos hooks

**Subtarefa B5 — CSS da toolbar**
- Remover do `App.css`: `.page-section-header`, `.page-columns-toggle`
- Adicionar: `.section-toolbar`, `.editor-drawer`, `.section-settings-panel`

---

### Fase 7-C — Redesign do BlockCard `[Codex/Haiku]`

**Subtarefa C1 — Ações progressivas no BlockCard**
- Alterar `BlockCard.tsx`: remover todos os `IconButton` do layout padrão
- Adicionar `className="block-actions-bar"` com `opacity: 0; transition: opacity 0.15s` visível no `.page-block-card:hover`
- Hierarquia: `[✏️ Editar]` sempre visível no hover · `[↑][↓]` secundários · `[⋯]` abre dropdown com Duplicar / Mover coluna / Remover
- Criar componente `BlockActionsDropdown` com `useRef` para fechar no click fora

**Subtarefa C2 — Badge de tipo no bloco**
- Adicionar eyebrow badge `[Texto]` no canto superior esquerdo do bloco, visível em estado padrão
- CSS: `position: absolute; top: 6px; left: 8px; font-size: 0.7rem; opacity: 0.5`

---

### Fase 7-D — Modal de seleção de bloco `[Codex/Haiku]`

**Subtarefa D1 — Categorias na grade de blocos**
- Refatorar `BlockEditorModal.tsx`: mapear bloco → categoria
- Renderizar `<section>` por categoria com heading
- Manter a mesma chamada `handleSelectType(type)`

**Subtarefa D2 — Ícone por tipo de bloco**
- Adicionar campo `icon: string` (emoji ou FA) no `blockRegistry` para cada tipo
- Exibir ícone grande (2rem) no card de seleção

---

### Fase 7-E — Toolbar principal `[Codex/Haiku]`

**Subtarefa E1 — Painel de configurações da página no drawer**
- Mover o JSX de título/slug/descrição de `AdminPageEditorPage/index.tsx` para `PageSettingsPanel.tsx`
- Remover `editor-side` e `editor-grid` do layout — canvas passa a `max-width: 900px; margin: 0 auto`
- Toolbar adiciona botão `[⚙️ Página]` que abre o drawer

**Subtarefa E2 — Topbar responsiva**
- Reorganizar `PageEditorToolbar`: agrupar alertas em tooltip/badge em vez de texto inline
- Em mobile: colapsar ações em menu `⋯`

---

## 5. Sugestões adicionais (roadmap futuro)

- **Drag-and-drop de seções e blocos**: substituir os botões ↑/↓ por DnD com `@dnd-kit/core`. Complexidade alta, vale uma fase própria.
- **Undo/Redo**: manter histórico de `page.layout` (máx 20 estados) em `usePageEditor`. Ctrl+Z nativo.
- **Preview em iframe responsivo**: no modo Preview, renderizar a página num `<iframe>` com viewport configurável (Desktop / Tablet / Mobile).
- **Autosave**: debounce de 3s após qualquer mudança no layout → salva como rascunho automaticamente. Adicionar indicador "Salvo automaticamente há 2 min".
- **Duplicar página**: botão na listagem de páginas para clonar o JSON de layout.

---

## 6. Arquivos impactados por fase

| Fase | Arquivos |
|------|---------|
| 7-A | `pageLayoutHelpers.ts`, `useSectionManager.ts`, `SectionEditor.tsx`, `BlockEditorModal.tsx`, `validateBlockDraft.ts` (novo) |
| 7-B | `SectionEditor.tsx`, `SectionToolbar.tsx` (novo), `SectionSettingsPanel.tsx` (novo), `EditorDrawer.tsx` (novo), `useSectionManager.ts`, `AdminPageEditorPage/index.tsx`, `App.css` |
| 7-C | `BlockCard.tsx`, `BlockActionsDropdown.tsx` (novo), `App.css` |
| 7-D | `BlockEditorModal.tsx`, `blocks/registry.ts` |
| 7-E | `PageEditorToolbar.tsx`, `PageSettingsPanel.tsx` (novo), `AdminPageEditorPage/index.tsx`, `App.css` |

---

## 7. Critérios de aceitação por fase

- **7-A**: nenhum comportamento visual muda; dados salvos e recuperados corretamente; seção com 2 colunas pode reduzir para 1.
- **7-B**: header de seção sem toggles inline; drawer abre/fecha; inserir seção entre funciona.
- **7-C**: bloco sem ações visíveis em repouso; hover revela ações com hierarquia correta.
- **7-D**: modal categorizado com ícones; seleção de tipo funciona igual ao anterior.
- **7-E**: canvas ocupa largura total; painel de configurações da página abre no drawer.
