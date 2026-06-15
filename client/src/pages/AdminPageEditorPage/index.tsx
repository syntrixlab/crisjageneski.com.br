import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConfirmModal } from '@/components/AdminUI';
import { SeoHead } from '@/components/SeoHead';
import { PageRendererCore } from '@/components/PageRenderer';
import { usePageValidation } from '@/hooks/usePageValidation';
import { ValidationErrorsModal, ValidationInput, CharCounter } from '@/components/ValidationComponents';
import { usePageEditor, slugify } from './hooks/usePageEditor';
import { useSectionManager } from './hooks/useSectionManager';
import { useBlockManager } from './hooks/useBlockManager';
import { PageEditorToolbar } from './components/PageEditorToolbar';
import { SectionEditor } from './components/SectionEditor';
import { BlockEditorModal } from './components/BlockEditorModal';
import { SectionPresetModal } from './components/SectionPresetModal';
import { MoveBlockModal } from './components/MoveBlockModal';

export function AdminPageEditorPage({ pageKey }: { pageKey?: string }) {
  const { id } = useParams<{ id: string }>();
  const editor = usePageEditor(id, pageKey);
  const {
    page, setPage, viewMode, setViewMode, formError, draftAlert,
    busyMutations, isNew, isHomePage, isLoadingPage, isPageError,
    refetchPage, saveDraft, publish, handleMoveToDraft
  } = editor;

  const sections = useSectionManager(setPage, page.layout.sections);
  const blocks = useBlockManager(setPage, page.layout.sections);
  const { errors: validationErrors, fieldStates, markFieldTouched, validateForPublication } = usePageValidation(page);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const busy = busyMutations || blocks.hasUploading;

  const handlePublish = async () => {
    if (isHomePage) {
      await saveDraft();
      return;
    }
    const errors = validateForPublication();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    const saved = await saveDraft();
    if (!saved?.id) return;
    await publish(saved.id);
  };

  if (isHomePage && isLoadingPage) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Pagina inicial</h1>
          <p className="muted">Carregando builder...</p>
        </div>
        <div className="admin-card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: '18px', width: '180px' }} />
          <div className="skeleton" style={{ height: '12px', width: '60%' }} />
          <div className="skeleton" style={{ height: '280px', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (isHomePage && isPageError) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-card">
          <div className="admin-empty">
            <h3>Erro ao carregar a home</h3>
            <p className="muted">Não foi possivel recuperar os blocos da pagina inicial.</p>
            <button className="btn btn-primary" type="button" onClick={() => refetchPage()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const columnCount = blocks.blockModal
    ? Math.max(
        1,
        Math.min(
          (page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.settings?.columnsLayout as number) ||
            page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.columnsLayout ||
            page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.columns ||
            2,
          3
        )
      )
    : 2;

  return (
    <div className="admin-page editor-page">
      <SeoHead title={isNew ? 'Nova página' : `Editar: ${page.title}`} />
      <PageEditorToolbar
        page={page}
        isNew={isNew || !page.id}
        busy={busy}
        draftAlert={draftAlert}
        formError={formError}
        hasUploading={blocks.hasUploading}
        viewMode={viewMode}
        isHomePage={isHomePage}
        onViewModeChange={setViewMode}
        onSaveDraft={() => saveDraft()}
        onPublish={handlePublish}
        onMoveToDraft={handleMoveToDraft}
      />

      <div className="editor-body">
        <div className="editor-container">
          <div className="editor-grid">
            <div className="editor-main">
              {viewMode === 'preview' ? (
                <div className="page-preview-wrapper">
                  {page.layout.sections.length === 0 ? (
                    <div className="admin-empty">
                      <p>Nenhuma seção adicionada. Volte para o modo de edição para adicionar conteúdo.</p>
                    </div>
                  ) : (
                    <PageRendererCore
                      layout={page.layout}
                      enableFormSubmit={false}
                      pageSlug={isHomePage ? 'home' : page.slug || 'preview'}
                    />
                  )}
                </div>
              ) : (
                <div className="page-editor-canvas">
                  {page.layout.sections.length === 0 && (
                    <div className="admin-empty">
                      <p>Nenhuma seção adicionada. Clique em "+ Adicionar seção" para começar.</p>
                    </div>
                  )}
                  {page.layout.sections.map((section, sectionIndex) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      sectionIndex={sectionIndex}
                      totalSections={page.layout.sections.length}
                      onChangeSectionColumns={(cols) => sections.handleChangeSectionColumns(section.id, cols)}
                      onChangeSectionBackground={(bg) => sections.handleChangeSectionBackground(section.id, bg)}
                      onChangeSectionPadding={(pad) => sections.handleChangeSectionPadding(section.id, pad)}
                      onChangeSectionMaxWidth={(mw) => sections.handleChangeSectionMaxWidth(section.id, mw)}
                      onChangeSectionHeight={(h) => sections.handleChangeSectionHeight(section.id, h)}
                      onMoveSection={(dir) => sections.handleMoveSection(section.id, dir)}
                      onRemoveSection={() => sections.handleRemoveSection(section.id)}
                      onDuplicateSection={() => sections.handleDuplicateSection(section.id)}
                      onAddBlock={(colIndex, insertIndex) => blocks.handleOpenAddBlock(section.id, colIndex, insertIndex)}
                      onAddBlockSide={(colIndex, rowIndex) => blocks.handleAddBlockSide(section.id, colIndex, rowIndex)}
                      onEditBlock={(colIndex, block, blockIndex) => blocks.handleOpenEditBlock(section.id, colIndex, block, blockIndex)}
                      onMoveBlock={(colIndex, blockId, dir) => blocks.handleMoveBlock(section.id, colIndex, blockId, dir)}
                      onMoveBlockColumn={(colIndex, blockIndex, block) => blocks.handleOpenMoveModal(section.id, colIndex, blockIndex, block)}
                      onDeleteBlock={(colIndex, block) => blocks.setDeleteModal({ open: true, sectionId: section.id, columnIndex: colIndex, block })}
                      onDuplicateBlock={(colIndex, blockId) => blocks.handleDuplicateBlock(section.id, colIndex, blockId)}
                    />
                  ))}
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn btn-outline" type="button" onClick={sections.handleAddSection}>
                      + Adicionar seção
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="editor-side">
              <div className="admin-card editor-card" style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="muted small">Configurações da Página</div>
                <div className="editor-field">
                  <label>Título</label>
                  <ValidationInput
                    fieldId="page-title"
                    hasError={fieldStates['page-title']?.hasError || false}
                    errorMessage={fieldStates['page-title']?.errorMessage}
                    showError={fieldStates['page-title']?.isTouched}
                  >
                    <input
                      value={page.title}
                      onChange={(e) => setPage((prev) => ({ ...prev, title: e.target.value }))}
                      onBlur={() => markFieldTouched('page-title')}
                      placeholder="Título da página"
                    />
                  </ValidationInput>
                </div>
                <div className="editor-field">
                  <label>Slug</label>
                  <ValidationInput
                    fieldId="page-slug"
                    hasError={fieldStates['page-slug']?.hasError || false}
                    errorMessage={fieldStates['page-slug']?.errorMessage}
                    showError={fieldStates['page-slug']?.isTouched}
                  >
                    <input
                      value={page.slug}
                      onChange={(e) => setPage((prev) => ({ ...prev, slug: e.target.value }))}
                      onBlur={(e) => {
                        markFieldTouched('page-slug');
                        setPage((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                      }}
                      placeholder="ex: sobre, contato, servicos"
                    />
                  </ValidationInput>
                  <p className="muted small">URLs públicas ficam em /p/slug. Use letras minúsculas e hifens.</p>
                </div>
                <div className="editor-field">
                  <label>Descrição</label>
                  <textarea
                    value={page.description ?? ''}
                    onChange={(e) => setPage((prev) => ({ ...prev, description: e.target.value }))}
                    onBlur={() => markFieldTouched('page-description')}
                    rows={3}
                  />
                  <CharCounter text={page.description || ''} limit={300} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BlockEditorModal
        state={blocks.blockModal}
        onClose={() => blocks.setBlockModal(null)}
        onSave={blocks.handleSaveBlock}
        onUploadingChange={blocks.setHasUploading}
        columnCount={columnCount}
      />

      <SectionPresetModal
        open={sections.presetModal}
        onClose={() => sections.setPresetModal(false)}
        onSelectPreset={sections.handleSelectPreset}
        onAddBlank={sections.handleAddBlankSection}
        sections={page.layout.sections}
      />

      <MoveBlockModal
        state={blocks.moveModal}
        section={blocks.moveModal ? page.layout.sections.find((s) => s.id === blocks.moveModal!.sectionId) : undefined}
        onClose={() => blocks.setMoveModal(null)}
        onConfirm={blocks.handleConfirmMoveColumn}
      />

      <ConfirmModal
        isOpen={!!blocks.deleteModal?.block}
        onClose={() => blocks.setDeleteModal(null)}
        title="Remover bloco"
        description="Tem certeza que deseja remover este bloco?"
        onConfirm={() =>
          blocks.deleteModal?.block &&
          blocks.handleDeleteBlock(
            blocks.deleteModal.sectionId,
            blocks.deleteModal.columnIndex,
            blocks.deleteModal.block.id
          )
        }
        confirmLabel="Remover"
      />

      <ValidationErrorsModal
        isOpen={showValidationErrors}
        onClose={() => setShowValidationErrors(false)}
        errors={validationErrors}
        onGoToError={() => setShowValidationErrors(false)}
      />
    </div>
  );
}
