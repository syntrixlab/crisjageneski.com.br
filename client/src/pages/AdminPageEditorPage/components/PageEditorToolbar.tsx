import React from 'react';
import { Link } from 'react-router-dom';
import { ArticleStatusBadge } from '@/components/AdminUI';
import type { PageForm } from '../hooks/usePageEditor';

export function PageEditorToolbar(_props: {
  page: PageForm;
  isNew: boolean;
  busy: boolean;
  draftAlert: string | null;
  formError: string | null;
  hasUploading: boolean;
  viewMode: 'edit' | 'preview';
  isHomePage?: boolean;
  backTo?: string;
  previewHref?: string;
  onViewModeChange: (mode: 'edit' | 'preview') => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
}) {
  const {
    page,
    isNew,
    busy,
    draftAlert,
    formError,
    hasUploading,
    viewMode,
    isHomePage,
    backTo,
    previewHref,
    onViewModeChange,
    onSaveDraft,
    onPublish,
    onMoveToDraft
  } = _props;
  const status = page.status ?? 'draft';
  const previewUrl = previewHref ?? (page.slug ? `/p/${page.slug}` : '/');
  const backTarget = backTo ?? '/admin/pages';
  return (
    <div className="editor-topbar compact">
      <div className="editor-topbar-left">
        <Link to={backTarget} className="btn btn-ghost">
          Voltar
        </Link>
        <ArticleStatusBadge status={status} />

        {/* Toggle Edição/Preview */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => onViewModeChange('edit')}
          >
            Edição
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
          >
            Preview
          </button>
        </div>

        {draftAlert && <span className="muted small">{draftAlert}</span>}
        {formError && <span className="muted small tone-danger">{formError}</span>}
        {hasUploading && <span className="muted small">Finalize uploads antes de salvar.</span>}
      </div>
      <div className="editor-topbar-actions">
        <button className="btn btn-outline" type="button" onClick={onSaveDraft} disabled={busy}>
          {isHomePage ? 'Salvar home' : 'Salvar rascunho'}
        </button>
        {!isHomePage &&
          (status === 'draft' ? (
            <button className="btn btn-primary" type="button" onClick={onPublish} disabled={busy || isNew}>
              Publicar
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={onMoveToDraft} disabled={busy}>
              Mover para rascunho
            </button>
          ))}
        {(!isHomePage && status === 'published') || isHomePage ? (
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => window.open(previewUrl, '_blank')}
            disabled={!previewUrl}
          >
            {isHomePage ? 'Ver site' : 'Visualizar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
