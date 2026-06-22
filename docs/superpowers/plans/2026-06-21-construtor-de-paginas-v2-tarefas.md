# Plano de execução — Construtor de Páginas v2 (tarefas granulares)

**Spec:** `docs/superpowers/specs/2026-06-21-construtor-de-paginas-v2.md`
**Data:** 2026-06-21

Cada tarefa é pequena, autocontida e escrita para ser executada por **Codex** ou **Claude Haiku** sem contexto adicional além do código e da spec. Formato de cada tarefa:

- **Objetivo** — o resultado esperado.
- **Arquivos** — onde mexer.
- **Passos** — o roteiro.
- **Aceite** — como saber que terminou.
- **Risco** — baixo/médio/alto.

Convenções obrigatórias (todas as tarefas): TypeScript strict, sem `any` sem justificativa, sem `console.log`, sem `window.confirm/prompt`, usar tokens/classes do `App.css` (nada de hex azul/cinza inline), operações de layout via `utils/pageLayoutHelpers.ts`. Rodar `cd client && npm run build` (ou `tsc`) ao final de cada tarefa.

Diretório base do editor: `client/src/pages/AdminPageEditorPage/`.

---

## FASE 0 — Fundamentos de estilo (baixo risco, ganho imediato)

### T0.1 — Criar seção CSS dedicada do builder
- **Objetivo:** abrir uma seção `/* ===== PAGE BUILDER V2 ===== */` no fim de `client/src/App.css` para abrigar as novas classes, e documentar os tokens de marca disponíveis num comentário (`--color-forest`, `--color-terracotta`, `--color-deep`, `--color-lines`).
- **Arquivos:** `client/src/App.css`.
- **Passos:** adicionar o cabeçalho de seção + comentário com a lista de tokens. Sem mudança visual ainda.
- **Aceite:** build passa; seção existe.
- **Risco:** baixo.

### T0.2 — Componente `SegmentedControl`
- **Objetivo:** criar um controle segmentado reutilizável (pílulas) para substituir radios empilhados.
- **Arquivos:** novo `client/src/components/AdminUI/SegmentedControl.tsx` (ou dentro de `AdminUI.tsx` se for o padrão do projeto — verificar como `IconButton` é exportado e seguir o mesmo); CSS em `App.css` (`.segmented-control`).
- **API:** `{ label?: string; value: string; options: { value: string; label: string; icon?: IconDefinition }[]; onChange: (v: string) => void; disabled?: boolean }`.
- **Estilo:** usar `--color-forest` para o item ativo (como o `.page-columns-toggle button.active` já faz). Reaproveitar essa estética.
- **Aceite:** renderiza, troca seleção, acessível por teclado (role="radiogroup").
- **Risco:** baixo.

### T0.3 — Refatorar `SectionSettingsPanel` para `SegmentedControl` + classes CSS
- **Objetivo:** trocar os 5 grupos de radios (colunas, fundo, espaçamento, altura, largura) por `SegmentedControl`; remover todos os inline styles.
- **Arquivos:** `components/SectionSettingsPanel.tsx`, `App.css`.
- **Passos:** mapear cada grupo para `options`; manter as mesmas callbacks (`onChangeSectionColumns`, etc.). Mover estilos inline (`marginBottom`, `label`...) para classes (`.inspector-field`, `.inspector-label`).
- **Aceite:** mesmo comportamento; visual coeso com a marca; zero inline style.
- **Risco:** baixo.

### T0.4 — Refatorar `PageSettingsPanel` (remover inline styles)
- **Objetivo:** mover inline styles para classes `.inspector-field` / `.inspector-label` (reutilizar as de T0.3).
- **Arquivos:** `components/PageSettingsPanel.tsx`, `App.css`.
- **Aceite:** idem visual/comportamento; sem inline style.
- **Risco:** baixo.

### T0.5 — Re-tematizar `SectionPresetModal` e `MoveBlockModal`
- **Objetivo:** remover a paleta azul/cinza (`#3b82f6`, `#e5e7eb`, `#6b7280`, `#1f2937`) e os handlers `onMouseEnter/Leave` inline; usar classes CSS com tokens da marca.
- **Arquivos:** `components/SectionPresetModal.tsx`, `components/MoveBlockModal.tsx`, `App.css` (`.preset-card`, `.preset-card:hover`, `.preset-card[disabled]`).
- **Passos:** converter os botões de preset em `.preset-card`; estados hover/disabled via CSS, não JS.
- **Aceite:** cartões com hover na cor `--color-forest`; sem inline style nem hex genérico.
- **Risco:** baixo.

### T0.6 — Re-tematizar `EditorDrawer`
- **Objetivo:** mover os inline styles do drawer/overlay para classes CSS (`.editor-drawer`, `.editor-drawer-overlay`, `.editor-drawer-close`); largura via variável (preparar para inspector mais largo, ex.: 360px).
- **Arquivos:** `components/EditorDrawer.tsx`, `App.css`.
- **Aceite:** mesmo comportamento (abre/fecha/anima); sem inline style.
- **Risco:** baixo.

---

## FASE 1 — Inspector lateral + WYSIWYG no canvas

### T1.1 — Estado de seleção no editor
- **Objetivo:** introduzir um estado `selection` único: `{ kind: 'page' } | { kind: 'section'; sectionId } | { kind: 'block'; sectionId; columnIndex; blockId }` e `setSelection`.
- **Arquivos:** `index.tsx` (substituir `drawerMode`/`selectedSectionId` por `selection`).
- **Passos:** criar o tipo; mapear "Configurar página" → `{kind:'page'}`, "Configurar seção" → `{kind:'section'}`. Manter o drawer aberto quando `selection != null`.
- **Aceite:** abrir página/seção continua funcionando via novo estado.
- **Risco:** médio (toca a orquestração).

### T1.2 — `InspectorPanel` com 3 modos
- **Objetivo:** renderizar dentro do `EditorDrawer` o painel certo conforme `selection.kind`: `page` → `PageSettingsPanel`; `section` → `SectionSettingsPanel`; `block` → (novo) `BlockInspector`.
- **Arquivos:** `index.tsx`, novo `components/InspectorPanel.tsx`.
- **Aceite:** trocar seleção troca o conteúdo do painel.
- **Risco:** médio.

### T1.3 — `BlockInspector` (edição de bloco no painel)
- **Objetivo:** extrair do `BlockEditorModal` a parte de **edição** (renderiza o `Form` do bloco via `blockRegistry`, controle de `colSpan`, validação) para um componente usável no painel lateral. A seleção de tipo (galeria) permanece só no fluxo de "adicionar".
- **Arquivos:** novo `components/BlockInspector.tsx`; ajustar `BlockEditorModal.tsx` (passa a ser só "adicionar bloco" / escolha de tipo) ou reaproveitar.
- **Passos:** o `BlockInspector` recebe `block`, `columnCount`, `onChange(draft)` e aplica mudanças no `page` em tempo real (debounce opcional). Reusar `validateBlockDraft`.
- **Aceite:** selecionar um bloco mostra seu form no painel; editar reflete no canvas ao vivo.
- **Risco:** médio.

### T1.4 — `EditableBlock` (wrapper WYSIWYG no canvas)
- **Objetivo:** renderizar o bloco com `PageBlockView` (render público real) envolto num wrapper que adiciona contorno/overlay **apenas** em hover/seleção — sem o card de admin `[Hero]`/badges sempre visíveis.
- **Arquivos:** novo `components/EditableBlock.tsx`; usado por `SectionEditor`; CSS `.editable-block`, `.editable-block.is-selected`.
- **Passos:** clicar no bloco define a seleção; overlay com ações (editar/duplicar/ocultar/deletar) reaproveitando `BlockCard`'s ações. Manter regras de hero (lock).
- **Aceite:** canvas parece o site; seleção destaca o bloco; ações no overlay.
- **Risco:** médio.

### T1.5 — Migrar `SectionEditor` para `EditableBlock`
- **Objetivo:** trocar o uso de `BlockCard` por `EditableBlock` mantendo grid de colunas/linhas e os botões "+ adicionar bloco".
- **Arquivos:** `components/SectionEditor.tsx`.
- **Aceite:** layout multi-coluna intacto; render fiel; ações funcionam.
- **Risco:** médio.

### T1.6 — Render fiel da seção (fundos/espaçamento iguais ao site)
- **Objetivo:** fazer o container de seção no editor usar as mesmas classes do público (`.page-public-section.section-bg-*`) ou garantir paridade visual de `dark`/`earthy`/`soft`.
- **Arquivos:** `components/SectionEditor.tsx`, `App.css`.
- **Aceite:** comparar editor vs. `/p/slug` — fundos e paddings batem.
- **Risco:** médio.

---

## FASE 2 — Drag-and-drop (`@dnd-kit`)

### T2.1 — Instalar `@dnd-kit`
- **Objetivo:** adicionar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` ao `client`.
- **Arquivos:** `client/package.json`.
- **Passos:** `cd client && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
- **Aceite:** instala; build passa.
- **Risco:** baixo.

### T2.2 — DnD de seções (reordenar verticalmente)
- **Objetivo:** envolver a lista de seções num `DndContext` + `SortableContext` vertical; arrastar pela handle do `SectionToolbar` reordena.
- **Arquivos:** `index.tsx`, `components/SectionEditor.tsx`, `components/SectionToolbar.tsx` (handle), novo `hooks/usePageDnd.ts` (opcional).
- **Passos:** `onDragEnd` → `moveSection`/reordenação via helper. Hero não arrastável (sortable disabled).
- **Aceite:** arrastar seção reordena; hero travado; setas ainda funcionam.
- **Risco:** alto.

### T2.3 — DnD de blocos dentro da coluna
- **Objetivo:** cada coluna vira `SortableContext`; arrastar bloco reordena na própria coluna via `moveBlockInColumn`.
- **Arquivos:** `components/SectionEditor.tsx`, `components/EditableBlock.tsx` (handle de arrastar).
- **Aceite:** reordenar dentro da coluna por DnD; fallback de setas mantido.
- **Risco:** alto.

### T2.4 — DnD de blocos entre colunas / seções
- **Objetivo:** mover bloco para outra coluna (mesma seção) e para outra seção, via `onDragOver`/`onDragEnd`, usando `moveBlockToColumn` e (se preciso) novo helper `moveBlockAcrossSections` em `pageLayoutHelpers.ts` (com teste).
- **Arquivos:** `components/SectionEditor.tsx`, `index.tsx`, `utils/pageLayoutHelpers.ts`, `utils/pageLayoutHelpers.test.ts` (se existir; senão criar teste do helper novo).
- **Aceite:** arrastar entre colunas e entre seções funciona; respeita `colSpan` e hero; `MoveBlockModal` pode ser aposentado depois.
- **Risco:** alto.

### T2.5 — `DropZone` visual
- **Objetivo:** indicador de destino (linha/realce) durante o arraste.
- **Arquivos:** novo `components/DropZone.tsx`, `App.css` (`.drop-zone.is-over`).
- **Aceite:** ao arrastar, o ponto de soltura fica claro.
- **Risco:** médio.

---

## FASE 3 — Recursos

### T3.1 — Undo/redo (`usePageHistory`)
- **Objetivo:** pilha de snapshots de `page.layout` com `undo`/`redo`; coalescing por tempo (ex.: 400ms) para digitação; limite 50 estados.
- **Arquivos:** novo `hooks/usePageHistory.ts`; integrar em `usePageEditor.ts`/`index.tsx`.
- **Aceite:** desfazer/refazer mudanças de layout funciona sem corromper estado.
- **Risco:** alto.

### T3.2 — Atalhos de teclado
- **Objetivo:** `Ctrl/Cmd+Z` (undo), `Ctrl/Cmd+Shift+Z` (redo), `Ctrl/Cmd+S` (salvar), `Delete` (remover bloco selecionado, se não for hero).
- **Arquivos:** novo `hooks/useEditorShortcuts.ts`; `index.tsx`.
- **Passos:** ignorar quando foco está em input/textarea/contenteditable.
- **Aceite:** atalhos funcionam; não disparam ao digitar em campos.
- **Risco:** médio.

### T3.3 — Botões undo/redo na topbar
- **Objetivo:** expor undo/redo no `PageEditorToolbar` com estado disabled correto.
- **Arquivos:** `components/PageEditorToolbar.tsx`.
- **Aceite:** botões refletem disponibilidade do histórico.
- **Risco:** baixo (depende T3.1).

### T3.4 — Ocultar bloco/seção (`hidden`)
- **Objetivo:** adicionar `hidden?: boolean` em `PageBlock` e `PageSection.settings`; ação "Ocultar/Mostrar" no overlay/toolbar; `PageRendererCore` pula ocultos; no editor mostra esmaecido com selo "Oculto".
- **Arquivos:** `types/blocks.ts`, `types/layout.ts`, `components/EditableBlock.tsx`, `components/SectionToolbar.tsx`, `components/PageRenderer.tsx`, helpers se necessário, `App.css`.
- **Aceite:** ocultar remove do site público mas mantém editável; default (sem campo) = visível.
- **Risco:** médio.

### T3.5 — Inserir seção entre seções
- **Objetivo:** botão "+ seção aqui" entre cada par de seções, chamando `handleAddSection(afterSectionId)` que já existe.
- **Arquivos:** `index.tsx`/`components/SectionEditor.tsx`, `App.css` (`.section-inserter`).
- **Aceite:** inserir no meio funciona e abre o `SectionPresetModal` na posição certa.
- **Risco:** baixo.

### T3.6 — Busca no seletor de blocos
- **Objetivo:** campo de busca no topo da galeria do `BlockEditorModal` filtrando por label/descrição; manter agrupamento por categoria.
- **Arquivos:** `components/BlockEditorModal.tsx`.
- **Aceite:** digitar filtra; vazio mostra "nenhum bloco".
- **Risco:** baixo.

### T3.7 — Preview responsivo (device toggle)
- **Objetivo:** estado `device: 'desktop'|'tablet'|'mobile'` na topbar; aplicar `max-width` ao container (1200/768/390) no modo Preview (e idealmente no editor).
- **Arquivos:** `components/PageEditorToolbar.tsx`, `index.tsx`, `App.css` (`.canvas-device-*`).
- **Aceite:** trocar device muda a largura do preview.
- **Risco:** médio.

### T3.8 — Indicador de alterações não salvas / aviso ao sair
- **Objetivo:** flag "dirty" comparando estado vs. último salvo; aviso ao navegar/fechar com mudanças pendentes (usar `beforeunload` + bloqueio de rota do router).
- **Arquivos:** `hooks/usePageEditor.ts`, `index.tsx`.
- **Aceite:** editar marca "não salvo"; sair avisa.
- **Risco:** médio.

---

## FASE 4 — Personalização avançada + Outline

### T4.1 — `StyleControls` (kit reutilizável)
- **Objetivo:** `ColorSwatchPicker`, `ToggleRow`, `RangeRow` além do `SegmentedControl`, num diretório `components/StyleControls/`.
- **Arquivos:** novos componentes + `App.css`.
- **Aceite:** componentes isolados, sem dependência do editor.
- **Risco:** baixo.

### T4.2 — Cor de fundo custom da seção
- **Objetivo:** `settings.backgroundColor?` (hex), aplicado quando definido (sobrepõe preset). UI com `ColorSwatchPicker` (paleta da marca + custom).
- **Arquivos:** `types/layout.ts`, `components/SectionSettingsPanel.tsx`, `useSectionManager.ts`, `components/PageRenderer.tsx`, `components/SectionEditor.tsx`.
- **Aceite:** cor custom reflete no editor e no site; sem o campo = comportamento atual.
- **Risco:** médio.

### T4.3 — Controles extras de seção (gap, alinhamento vertical, âncora, nome)
- **Objetivo:** `columnGap`, `verticalAlign`, `anchorId`, `name` em `settings`.
- **Arquivos:** `types/layout.ts`, `SectionSettingsPanel.tsx`, `useSectionManager.ts`, `PageRenderer.tsx`/`SectionEditor.tsx`.
- **Aceite:** cada controle afeta render; defaults preservam layout atual; `anchorId` vira `id` no DOM público.
- **Risco:** médio.

### T4.4 — Outline / árvore de navegação
- **Objetivo:** painel esquerdo colapsável listando seções → blocos; clicar seleciona e rola até o elemento; mostra selo de oculto.
- **Arquivos:** novo `components/OutlinePanel.tsx`, `index.tsx`, `App.css`.
- **Aceite:** navegar pela árvore seleciona e rola; reflete `name`/`hidden`.
- **Risco:** médio.

### T4.5 — (Opcional) Reordenar via outline (DnD)
- **Objetivo:** arrastar seções no outline reordena (reusa infra da Fase 2).
- **Arquivos:** `components/OutlinePanel.tsx`.
- **Aceite:** reordenar no outline = reordenar no canvas.
- **Risco:** alto.

---

## Ordem sugerida e dependências

1. **Fase 0** inteira primeiro (rápida, destrava paleta/UX e cria `SegmentedControl`).
2. **Fase 1** (Inspector + WYSIWYG) — base para o resto.
3. **Fase 2** (DnD) — depende de `EditableBlock` (T1.4).
4. **Fase 3** — undo/redo (T3.1) deve vir antes dos atalhos (T3.2) e botões (T3.3); demais itens são independentes.
5. **Fase 4** — `StyleControls` (T4.1) antes dos controles que o usam.

Sugestão para distribuir entre agentes: **Haiku** pega Fase 0, T3.5, T3.6, T4.1 (tarefas pequenas e de baixo risco). **Codex** pega as de risco alto/médio (DnD, histórico, inspector). Cada tarefa fecha com `npm run build` verde.
