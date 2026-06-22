# Spec — Construtor de Páginas v2

**Data:** 2026-06-21
**Status:** Proposta (aguardando implementação)
**Escopo:** Editor visual reutilizado em `client/src/pages/AdminPageEditorPage` (Home, Páginas e qualquer construtor baseado em `PageLayoutV2`).
**Companheiro:** `docs/superpowers/plans/2026-06-21-construtor-de-paginas-v2-tarefas.md` (tarefas granulares).

---

## 1. Objetivo

Transformar o editor atual — funcional, porém engessado, visualmente datado e pobre em recursos — num **construtor de páginas genérico, fiel ao site (WYSIWYG), com drag-and-drop, edição em painel lateral e altamente personalizável**, capaz de montar páginas de qualquer segmento (não só a home da psicóloga).

Metas concretas (decididas com o Matheus):

1. **Drag-and-drop** de blocos e seções (lib `@dnd-kit`).
2. **Edição no painel lateral** (drawer) com o canvas atualizando ao lado, em tempo real.
3. **Render fiel ao site** no canvas de edição — usar os renderers públicos reais, não "cards de admin".
4. **Estilo alinhado à marca** (paleta forest/terracotta, tokens do `App.css`), eliminando inline styles soltos e a paleta azul/cinza genérica.
5. **Novos recursos**: undo/redo, ocultar bloco/seção, preview responsivo, inserir seção entre seções, busca no seletor de blocos, atalhos de teclado.
6. **Alta personalização**: expor mais controles de estilo por seção/bloco (espaçamento, alinhamento, cor, largura, etc.) de forma consistente.

---

## 2. Diagnóstico do estado atual

### 2.1 Arquitetura (boa base, manter)

O editor já está bem decomposto:

- `index.tsx` — orquestra hooks + componentes.
- `hooks/usePageEditor.ts` — carga/salvamento/estado da página (`PageForm`).
- `hooks/useSectionManager.ts` — CRUD de seções + settings.
- `hooks/useBlockManager.ts` — CRUD de blocos, modais de mover/deletar.
- `components/` — `SectionEditor`, `BlockCard`, `BlockEditorModal`, `SectionPresetModal`, `SectionToolbar`, `BlockActionsDropdown`, `EditorDrawer`, `SectionSettingsPanel`, `PageSettingsPanel`, `PageEditorToolbar`, `MoveBlockModal`.
- `blocks/` — registry com 16 tipos, cada um com `renderer.tsx` + `Form.tsx` + `schema.ts`.
- Modelo de dados: `PageLayoutV2 → PageSection[] → cols[] → blocks[]` (`types/layout.ts`).

Essa estrutura é sólida e **deve ser preservada e estendida**, não reescrita.

### 2.2 Problemas (o que está engessado / mal estilizado)

**Interação rígida**
- Reordenar bloco: só setas ↑/↓ dentro da coluna (`BlockCard`).
- Mover entre colunas: modal dedicado (`MoveBlockModal`) — fluxo lento.
- Mover seção: setas ↑/↓ (`SectionToolbar`).
- Sem arrastar, sem soltar, sem reordenar visualmente.

**Edição desconectada do canvas**
- Editar um bloco abre um **modal grande** (`BlockEditorModal`, 860px) que cobre a página; o usuário perde o contexto visual e não vê o resultado ao lado enquanto edita.

**Render não-fiel ("cards de admin")**
- O canvas mostra cada bloco dentro de `.page-block-card.admin-card` com badge `[Hero]`, cabeçalhos "Coluna 1/2", bordas tracejadas. Não se parece com o site publicado.
- Há um modo "Preview" separado (tab) que usa `PageRendererCore` real — ou seja, o WYSIWYG existe, mas só fora do modo de edição.
- No print enviado, o Hero renderiza quebrado no editor (imagem com `alt` cru sobreposto ao texto), reforçando a sensação de baixa qualidade.

**Estilo inconsistente / fora do tema**
- `SectionSettingsPanel`, `PageSettingsPanel`, `EditorDrawer`, `SectionPresetModal`, `MoveBlockModal` usam **inline styles** com cores hex cruas (`#3b82f6`, `#e5e7eb`, `#6b7280`, `#1f2937`) — paleta azul/cinza genérica, divergente do tema forest/terracotta definido em `App.css` (`--color-forest`, `--color-terracotta`, `--color-deep`, etc.).
- Settings de seção usam `radio buttons` nativos empilhados — visual de formulário cru, não de page builder.
- O drawer é fixo em 320px e improvisado com inline styles.

**Recursos ausentes**
- Sem **undo/redo**.
- Sem **ocultar** bloco/seção (só deletar).
- Sem **preview responsivo** (mobile/tablet/desktop).
- O `useSectionManager.handleAddSection(afterSectionId)` já suporta inserir seção numa posição, mas a **UI só expõe um "+ Adicionar seção" global no fim** — não há inserção entre seções.
- Seletor de blocos sem **busca/filtro** (16 tipos empilhados em 4 categorias).
- Sem **atalhos de teclado** (salvar, desfazer, deletar).
- Sem **autosave** nem indicador robusto de alterações não salvas (só `draftAlert` textual).
- Sem **nomear/colapsar** seções (páginas longas ficam difíceis de navegar).
- Personalização limitada: seção só tem `background` (4 opções), `padding` (3), `maxWidth` (2), `height` (2), `columns` (1-3). Blocos têm `colSpan`. Falta cor custom, alinhamento vertical, gap entre colunas, IDs de âncora, etc.

### 2.3 O que já funciona e deve ser reaproveitado

- `PageRendererCore` / `PageBlockView` (render público real) — base do WYSIWYG.
- `pageLayoutHelpers.ts` — todas as operações imutáveis de layout (add/remove/move/duplicate/colSpan, `canAddSideAtIndex`, etc.). DnD deve **chamar esses helpers**, não reimplementar.
- `usesPageValidation` + `ValidationErrorsModal`.
- `blockRegistry` (label, defaultData, renderer, form por tipo) — ponto de extensão central.
- `sectionPresets.ts` — galeria de presets.

---

## 3. Visão do produto-alvo

### 3.1 Layout da tela (3 zonas)

```
┌──────────────────────────────────────────────────────────────┐
│  TOPBAR: ← voltar · status · [Editar|Preview] · desfazer/refazer │
│          · device (📱 desktop/tablet/mobile) · Página · Salvar  │
├───────────────┬──────────────────────────────────┬───────────┤
│  OUTLINE       │         CANVAS (WYSIWYG)          │  INSPECTOR │
│  (árvore de    │   render fiel, blocos arrastáveis │  (drawer   │
│   seções/      │   com overlay de ações no hover   │   lateral: │
│   blocos,      │   + zonas de drop                 │   edição   │
│   colapsável)  │                                   │   do bloco │
│                │                                   │   /seção   │
│                │                                   │   /página) │
└───────────────┴──────────────────────────────────┴───────────┘
```

- **Outline (esquerda, opcional/colapsável):** árvore navegável de seções → colunas → blocos. Clicar seleciona e rola até o elemento. Permite reordenar seções por DnD também. Pode entrar numa fase posterior.
- **Canvas (centro):** renderiza com os renderers públicos reais (mesmo HTML/CSS do site). Cada bloco/seção ganha, no hover ou quando selecionado, um **overlay** flutuante com: handle de arrastar, editar, duplicar, ocultar, deletar. Zonas de drop aparecem entre blocos/colunas/seções ao arrastar.
- **Inspector (direita):** o `EditorDrawer` evolui para um painel de inspeção contextual. Ao selecionar um bloco, mostra o `Form` daquele bloco + controles de layout (colSpan, visibilidade). Ao selecionar uma seção, mostra `SectionSettingsPanel`. Sem seleção, mostra `PageSettingsPanel`.

### 3.2 Princípios de personalização

- Todo controle de estilo vive num **schema declarativo** por seção/bloco, renderizado por componentes de UI reutilizáveis (`StyleControls`), nunca inline styles ad-hoc.
- Personalização progressiva: controles básicos sempre visíveis; avançados num accordion "Avançado".
- Tudo que o usuário personaliza precisa refletir **imediatamente** no canvas (estado controlado, sem "aplicar").

---

## 4. Arquitetura das mudanças

### 4.1 Drag-and-drop (`@dnd-kit`)

- Dependência: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- Um `DndContext` no `index.tsx` envolvendo o canvas.
- **Seções**: `SortableContext` vertical com a lista de `section.id`.
- **Blocos**: cada coluna é um `SortableContext`; mover entre colunas/seções usa `onDragOver`/`onDragEnd` resolvendo origem→destino e chamando os helpers existentes (`moveBlockInColumn`, `moveBlockToColumn`, e um novo `moveBlockAcrossSections` se necessário).
- Handles dedicados (não arrastar pelo corpo do bloco, para não conflitar com cliques de edição).
- `onDragEnd` despacha para os helpers imutáveis → mantém histórico de undo consistente.
- Acessibilidade: `@dnd-kit` traz suporte a teclado; manter as setas ↑/↓ como fallback.

### 4.2 Edição lateral (Inspector) e WYSIWYG

- Renomear/evoluir `EditorDrawer` → `InspectorPanel`, com 3 modos: `page` | `section` | `block`.
- Novo estado de **seleção** no editor: `{ type: 'block'|'section'|'page', sectionId?, columnIndex?, blockId? }`.
- O `BlockEditorModal` vira `BlockInspector` (mesmo conteúdo: seletor de tipo só na criação, depois o `Form` do bloco) renderizado dentro do painel lateral. O modal pode ser mantido só para o fluxo de "adicionar bloco" (escolha de tipo em galeria) e a edição passa para o painel.
- O canvas deixa de usar `.page-block-card.admin-card`; passa a renderizar `PageBlockView` "puro" envolto num **wrapper de seleção** (`EditableBlock`) que só adiciona overlay/contorno quando hover/selecionado — o conteúdo é idêntico ao site.

### 4.3 Histórico (undo/redo)

- Hook `usePageHistory` (ou estender `usePageEditor`) mantendo uma pilha de snapshots de `page.layout` (com coalescing por tempo p/ digitação).
- Atalhos `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`.
- Limite de N estados (ex.: 50) para não estourar memória.

### 4.4 Preview responsivo

- Estado `device: 'desktop' | 'tablet' | 'mobile'` na topbar.
- O canvas aplica `max-width` (ex.: 1200 / 768 / 390px) ao container do preview, simulando breakpoints. Vale tanto no modo Preview quanto, idealmente, no modo edição.

### 4.5 Modelo de dados — extensões (retrocompatíveis)

Toda extensão é **opcional** e tem default que reproduz o comportamento atual (não quebra páginas salvas).

`PageSection.settings` ganha (opcionais):
- `backgroundColor?: string` (cor custom, além dos presets nomeados).
- `verticalAlign?: 'top' | 'center' | 'bottom'`.
- `columnGap?: 'sm' | 'md' | 'lg'`.
- `anchorId?: string` (âncora p/ links internos).
- `hidden?: boolean` (ocultar seção sem deletar).
- `name?: string` (rótulo amigável no outline).

`PageBlock` ganha (opcionais):
- `hidden?: boolean` (ocultar bloco).
- `align?: 'left' | 'center' | 'right'` quando aplicável (já existe em alguns blocos via data; padronizar no wrapper).

> Importante: `hidden` deve ser respeitado pelo **renderer público** (`PageRendererCore`) — bloco/seção oculto não aparece no site, mas continua editável no admin (com indicação visual de "oculto").

---

## 5. Design / estilo

### 5.1 Tokens (usar os existentes do `App.css`)

Paleta da marca já definida: `--color-forest`, `--color-terracotta`, `--color-deep`, `--color-lines`, `--section-bg`, etc. **Nenhum hex novo de azul/cinza.** Todo componente do editor deve:

- Usar classes CSS no `App.css` (seção dedicada `/* ===== PAGE BUILDER V2 ===== */`), não inline styles.
- Reaproveitar `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `IconButton`, `Modal`, `ConfirmModal` de `components/AdminUI`.

### 5.2 Componentes de UI a criar

- `StyleControls/` — controles reutilizáveis de personalização: `SegmentedControl` (substitui os radios empilhados), `ColorSwatchPicker`, `ToggleRow`, `RangeRow`. Usados tanto em seção quanto em bloco.
- `SelectionOverlay` — barra flutuante de ações (arrastar/editar/duplicar/ocultar/deletar) posicionada sobre o elemento selecionado.
- `DropZone` — indicador visual de onde o item vai cair.

### 5.3 Empty states e canvas

- Empty state da página: ilustração + CTA "Adicionar primeira seção" (usar paleta da marca).
- Empty state de coluna/linha: zona de drop sutil + "+ bloco", sem texto "linha vazia" cru.
- Remover os rótulos "Coluna 1/2" sempre visíveis; mostrá-los só no hover/seleção da seção ou apenas no outline.

---

## 6. Faseamento (resumo; detalhe no plano)

- **Fase 0 — Fundamentos de estilo:** mover inline styles p/ `App.css`, `SegmentedControl`, alinhar paleta. (Baixo risco, ganho visual imediato.)
- **Fase 1 — Inspector lateral + WYSIWYG no canvas:** edição no painel, `EditableBlock`, render fiel.
- **Fase 2 — Drag-and-drop:** `@dnd-kit` p/ blocos e seções.
- **Fase 3 — Recursos:** undo/redo, ocultar, inserir seção entre seções, busca no seletor, preview responsivo, atalhos.
- **Fase 4 — Personalização avançada + Outline:** novos controles de estilo, árvore de outline, âncoras, nome de seção.

Cada fase é independente e entrega valor isolado; podem ser implementadas em ordem.

---

## 7. Restrições e invariantes (não quebrar)

- **Hero é seção/bloco fixo:** única por página, não move/deleta (`kind === 'hero'`, `block.type === 'hero'`). Toda nova interação (DnD inclusive) deve respeitar isso.
- **Retrocompatibilidade:** páginas em `PageLayoutV2` já salvas devem abrir e renderizar igual. Campos novos são opcionais com defaults.
- **TypeScript strict**, sem `any` injustificado (CLAUDE.md).
- **Sem `window.confirm/prompt`** — usar `Modal`/`ConfirmModal`.
- **Sem `console.log`** em produção.
- Placeholders de imagem: `@/assets/image-placeholder.svg`.
- Operações de layout sempre via `pageLayoutHelpers.ts` (imutáveis).
- Cobrir com testes os helpers novos (ex.: `PageEditorToolbar.test.tsx` já existe como referência).

---

## 8. Riscos

- **DnD entre colunas/seções** é a parte mais complexa (estados de origem/destino, colSpan, hero). Mitigar com helpers testados e fallback de setas.
- **WYSIWYG no canvas** pode expor diferenças de CSS entre admin e público; validar com as seções de fundo `dark`/`earthy`.
- **Histórico + formulários controlados** podem gerar muitos snapshots; usar coalescing.
- Escopo grande: seguir o faseamento, entregando incremental.
