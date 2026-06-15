# Fase 4: Decomposição do Editor de Páginas — Design

**Data:** 2026-06-15  
**Escopo:** `client/src/pages/AdminPageEditorPage.tsx` (1946 linhas pós-Fase 3)  
**Objetivo:** Transformar o arquivo monolítico em uma pasta com hooks e sub-componentes focados, reduzindo o orquestrador para ~200 linhas.

---

## Contexto

Após a Fase 3 (registry de blocos), o `AdminPageEditorPage.tsx` caiu de 4514 para 1946 linhas. O switch de formulários foi eliminado — o `BlockEditorModal` já usa `blockRegistry` para renderizar o form correto. O que sobrou:

- Componente principal com ~655 linhas misturando estado, mutations, handlers e UI
- Sub-componentes inline no mesmo arquivo: `SectionEditor`, `BlockCard`, `BlockEditorModal`, `SectionPresetModal`, `MoveBlockModal`, `PageEditorActions`
- ~15 constantes `default*Data` redundantes (duplicam `blockRegistry[type].defaultData`)

---

## Estrutura de arquivos alvo

```
client/src/pages/AdminPageEditorPage/
├── index.tsx                          ← orquestrador (~200 linhas)
├── hooks/
│   ├── usePageEditor.ts               ← estado + mutations + save/publish
│   ├── useSectionManager.ts           ← handlers de seção + presetModal state
│   └── useBlockManager.ts             ← handlers de bloco + estados dos modais
└── components/
    ├── PageEditorToolbar.tsx           ← topbar (voltar, status, toggle, salvar, publicar)
    ├── SectionEditor.tsx               ← edição de uma seção (colunas + blocos)
    ├── BlockCard.tsx                   ← card de bloco individual no canvas
    ├── BlockEditorModal.tsx            ← modal add/edit bloco (usa blockRegistry)
    ├── SectionPresetModal.tsx          ← modal galeria de presets
    └── MoveBlockModal.tsx              ← modal mover bloco de coluna
```

O arquivo `AdminPageEditorPage.tsx` é deletado. Imports existentes em outros arquivos continuam funcionando sem mudança — `index.tsx` exporta `AdminPageEditorPage` com o mesmo nome.

### Convenção de nomenclatura

- Sufixo `Modal` → componente que aparece sobre a tela via trigger (ex: `BlockEditorModal`, `SectionPresetModal`)
- Sem sufixo → componente que compõe a tela diretamente (ex: `SectionEditor`, `BlockCard`, `PageEditorToolbar`)

---

## Hooks

### `usePageEditor(id, pageKey)`

Responsável por: estado da página, query de carregamento, mutations de criação/atualização/publicação/despublicação, lógica de save e publish.

**Estado gerenciado:**
- `page: PageForm` — dados da página em edição
- `viewMode: 'edit' | 'preview'`
- `formError: string | null`
- `draftAlert: string | null`

**Ações retornadas:**
- `saveDraft()` — valida e salva (create ou update conforme `isNew`)
- `handlePublish()` — valida, salva e publica
- `handleMoveToDraft()` — despublica

**Metadados retornados:**
- `isNew`, `isHomePage`, `busy`, `isLoadingPage`, `isPageError`, `refetchPage`

```typescript
export function usePageEditor(id: string | undefined, pageKey?: string) {
  const isHomePage = pageKey === 'home'
  const isNew = !isHomePage && (!id || id === 'new')
  // ... query, mutations, estado, handlers
  return { page, setPage, viewMode, setViewMode, formError, draftAlert,
           busy, isNew, isHomePage, isLoadingPage, isPageError, refetchPage,
           saveDraft, handlePublish, handleMoveToDraft }
}
```

---

### `useSectionManager(setPage, sections)`

Responsável por: todos os handlers que modificam seções, e o estado do modal de presets.

**Estado gerenciado:**
- `presetModal: boolean`

**Ações retornadas:**
- `handleAddSection()` — abre presetModal
- `handleSelectPreset(presetId)` — cria seção a partir de preset
- `handleAddBlankSection()` — cria seção em branco
- `handleRemoveSection(sectionId)`
- `handleDuplicateSection(sectionId)`
- `handleMoveSection(sectionId, direction)`
- `handleChangeSectionColumns(sectionId, columns)`
- `handleChangeSectionBackground(sectionId, background)`
- `handleChangeSectionPadding(sectionId, padding)`
- `handleChangeSectionMaxWidth(sectionId, maxWidth)`
- `handleChangeSectionHeight(sectionId, height)`
- `presetModal`, `setPresetModal`

Todas as funções de mutação de seção chamam `setPage(prev => ({ ...prev, layout: ... }))` usando os helpers de `pageLayoutHelpers`.

---

### `useBlockManager(setPage)`

Responsável por: handlers de bloco e estados dos três modais de bloco.

**Estado gerenciado:**
- `blockModal: BlockModalState | null`
- `moveModal: MoveModalState | null`
- `deleteModal: DeleteModalState | null`
- `hasUploading: boolean`

**Ações retornadas:**
- `handleOpenAddBlock(sectionId, columnIndex, insertIndex)`
- `handleOpenEditBlock(sectionId, columnIndex, block, blockIndex)`
- `handleSaveBlock(draft)` — add ou update conforme `blockModal.mode`
- `handleMoveBlock(sectionId, columnIndex, blockId, direction)`
- `handleOpenMoveModal(sectionId, columnIndex, blockIndex, block)`
- `handleConfirmMoveColumn(targetColumn)`
- `handleDeleteBlock(sectionId, columnIndex, blockId)`
- `handleAddBlockSide(sectionId, fromColumnIndex, rowIndex)`
- `handleDuplicateBlock(sectionId, columnIndex, blockId)`
- Setters: `setBlockModal`, `setMoveModal`, `setDeleteModal`, `setHasUploading`

---

## Componentes

### `PageEditorToolbar`

Extração direta de `PageEditorActions` (renomeada). Props idênticas às atuais.

### `SectionEditor`

Extração direta. Recebe `section`, `sectionIndex`, `totalSections` e os callbacks de seção/bloco. Internamente usa `BlockCard` (importado de `components/`) e `AddBlockButton` — este último é um botão auxiliar de 8 linhas usado exclusivamente por `SectionEditor`, então fica definido dentro do próprio `SectionEditor.tsx` sem arquivo separado.

### `BlockCard`

Extração direta. Recebe `block` e callbacks de ação (edit, delete, duplicate, move...).

### `BlockEditorModal`

Extração direta + limpeza do `defaultData` (ver seção abaixo).

### `SectionPresetModal` e `MoveBlockModal`

Extrações diretas sem mudança de comportamento.

---

## Limpeza do defaultData

O `BlockEditorModal` atual contém ~15 constantes `default*Data` e um ternário de 14 linhas em `handleSelectType`. Ambos são redundantes após a Fase 3.

**Antes:**
```typescript
const defaults =
  type === 'text' ? defaultTextData :
  type === 'image' ? defaultImageData :
  // ... 12 mais
  defaultHeroData
```

**Depois:**
```typescript
const config = blockRegistry[type as BlockType]
if (!config) return
setDraft({ type, data: config.defaultData as PageBlock['data'], colSpan: span })
```

As ~15 constantes `default*Data` são removidas. O registry passa a ser a única fonte de verdade para dados padrão de bloco.

---

## O orquestrador (`index.tsx`)

```typescript
export function AdminPageEditorPage({ pageKey }: { pageKey?: string }) {
  const { id } = useParams<{ id: string }>()
  const editor = usePageEditor(id, pageKey)
  const sections = useSectionManager(editor.setPage, editor.page.layout.sections)
  const blocks = useBlockManager(editor.setPage)
  const validation = usePageValidation(editor.page)

  if (editor.isHomePage && editor.isLoadingPage) return <HomeLoadingState />
  if (editor.isHomePage && editor.isPageError) return <HomeErrorState onRetry={editor.refetchPage} />

  return (
    <div className="admin-page editor-page">
      <SeoHead title={...} />
      <PageEditorToolbar
        page={editor.page}
        isNew={editor.isNew}
        busy={editor.busy}
        draftAlert={editor.draftAlert}
        formError={editor.formError}
        hasUploading={blocks.hasUploading}
        viewMode={editor.viewMode}
        isHomePage={editor.isHomePage}
        onViewModeChange={editor.setViewMode}
        onSaveDraft={editor.saveDraft}
        onPublish={editor.handlePublish}
        onMoveToDraft={editor.handleMoveToDraft}
      />
      <div className="editor-body">
        <div className="editor-container">
          <div className="editor-grid">
            <div className="editor-main">
              {/* canvas ou preview */}
            </div>
            <div className="editor-side">
              {/* campos título/slug/descrição */}
            </div>
          </div>
        </div>
      </div>
      <BlockEditorModal
        state={blocks.blockModal}
        onClose={() => blocks.setBlockModal(null)}
        onSave={blocks.handleSaveBlock}
        onUploadingChange={blocks.setHasUploading}
        columnCount={...}
      />
      <SectionPresetModal
        open={sections.presetModal}
        onClose={() => sections.setPresetModal(false)}
        onSelectPreset={sections.handleSelectPreset}
        onAddBlank={sections.handleAddBlankSection}
        sections={editor.page.layout.sections}
      />
      <MoveBlockModal
        state={blocks.moveModal}
        section={...}
        onClose={() => blocks.setMoveModal(null)}
        onConfirm={blocks.handleConfirmMoveColumn}
      />
      <ConfirmModal {/* delete bloco */} />
      <ValidationErrorsModal {/* erros de publicação */} />
    </div>
  )
}
```

Meta: zero handlers inline, zero estado de modal, zero mutations no `index.tsx`.

---

## O que não muda

- Nenhuma alteração de comportamento ou UI
- Tipos `BlockModalState`, `MoveModalState`, `DeleteModalState`, `BlockDraft` — movidos para `hooks/useBlockManager.ts` (onde são usados como estado). Tipo `PageForm` fica em `hooks/usePageEditor.ts`
- Imports de outros arquivos que referenciam `AdminPageEditorPage` continuam funcionando via barrel `index.tsx`
- Nenhum novo bloco, nenhuma nova feature

---

## Critério de sucesso

- `index.tsx` com ≤ 220 linhas
- Nenhum arquivo de componente ou hook com mais de 300 linhas
- TypeScript compila sem erros (`tsc --noEmit`)
- Editor funciona identicamente ao estado pré-refatoração
