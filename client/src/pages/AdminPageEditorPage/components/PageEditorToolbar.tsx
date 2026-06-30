import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCircleInfo,
  faEllipsisVertical,
  faEye,
  faFileLines,
  faFloppyDisk,
  faGear,
  faLayerGroup,
  faRotateLeft,
  faRotateRight,
  faTriangleExclamation,
  faUpload
} from '@fortawesome/free-solid-svg-icons';
import { ArticleStatusBadge } from '@/components/AdminUI';
import type { PageForm } from '../hooks/usePageEditor';

type PageEditorToolbarProps = {
  page: PageForm;
  isNew: boolean;
  busy: boolean;
  draftAlert: string | null;
  formError: string | null;
  validationMessages?: string[];
  hasUploading: boolean;
  viewMode: 'edit' | 'preview';
  isHomePage?: boolean;
  backTo?: string;
  previewHref?: string;
  onViewModeChange: (mode: 'edit' | 'preview') => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onConfigurePage?: () => void;
  isDirty?: boolean;
  onToggleOutline?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};

export function PageEditorToolbar({
  page,
  isNew,
  busy,
  draftAlert,
  formError,
  validationMessages,
  hasUploading,
  viewMode,
  isHomePage,
  backTo,
  previewHref,
  onViewModeChange,
  onSaveDraft,
  onPublish,
  onMoveToDraft,
  onConfigurePage,
  isDirty,
  onToggleOutline,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: PageEditorToolbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const status = page.status ?? 'draft';
  const previewUrl = previewHref ?? (page.slug ? `/p/${page.slug}` : '/');
  const backTarget = backTo ?? '/admin/pages';
  const alerts = Array.from(
    new Set(
      [
        draftAlert,
        formError,
        hasUploading ? 'Finalize uploads antes de salvar.' : null,
        ...(validationMessages ?? [])
      ].filter(Boolean) as string[]
    )
  );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="editor-topbar compact">
      <div className="editor-topbar-left">
        <Link to={backTarget} className="btn btn-ghost editor-topbar-back">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Voltar</span>
        </Link>
        <ArticleStatusBadge status={status} />

        <div className="view-mode-toggle" role="tablist" aria-label="Modo de visualização">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'edit'}
            className={`view-mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => onViewModeChange('edit')}
          >
            Edição
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'preview'}
            className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
          >
            Preview
          </button>
        </div>

        {onToggleOutline && (
          <button
            type="button"
            className="btn btn-ghost editor-outline-btn"
            onClick={onToggleOutline}
            title="Organizar seções"
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            <span>Seções</span>
          </button>
        )}

        {(onUndo || onRedo) && (
          <div className="editor-undo-group">
            <button
              type="button"
              className="btn btn-ghost editor-undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              aria-label="Desfazer"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button
              type="button"
              className="btn btn-ghost editor-undo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Shift+Z)"
              aria-label="Refazer"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>
        )}

        {alerts.length > 0 && (
          <div
            className={`editor-alert-chip ${formError ? 'is-error' : 'is-info'}`}
            tabIndex={0}
            role="button"
            aria-label={`${alerts.length} aviso${alerts.length > 1 ? 's' : ''}: ${alerts.join('. ')}`}
          >
            <FontAwesomeIcon icon={formError ? faTriangleExclamation : faCircleInfo} />
            <span>{alerts.length} aviso{alerts.length > 1 ? 's' : ''}</span>
            <div className="editor-alert-popover" role="tooltip">
              <p className="editor-alert-popover-title">
                {formError ? 'Não foi possível salvar' : 'Pendências da página'}
              </p>
              <ul>
                {alerts.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {isDirty && (
          <span className="editor-dirty-chip" title="Há alterações não salvas">
            Não salvo
          </span>
        )}
      </div>

      <div className="editor-topbar-actions editor-topbar-actions-desktop">
        {onConfigurePage && (
          <button className="btn btn-ghost" type="button" onClick={onConfigurePage} title="Configurar página">
            <FontAwesomeIcon icon={faGear} />
            <span>Página</span>
          </button>
        )}
        <button className="btn btn-outline" type="button" onClick={onSaveDraft} disabled={busy}>
          <FontAwesomeIcon icon={faFloppyDisk} />
          <span>{isHomePage ? 'Salvar home' : 'Salvar rascunho'}</span>
        </button>
        {!isHomePage &&
          (status === 'draft' ? (
            <button className="btn btn-primary" type="button" onClick={onPublish} disabled={busy || isNew}>
              <FontAwesomeIcon icon={faUpload} />
              <span>Publicar</span>
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={onMoveToDraft} disabled={busy}>
              <FontAwesomeIcon icon={faFileLines} />
              <span>Mover para rascunho</span>
            </button>
          ))}
        {(!isHomePage && status === 'published') || isHomePage ? (
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => window.open(previewUrl, '_blank')}
            disabled={!previewUrl}
          >
            <FontAwesomeIcon icon={faEye} />
            <span>{isHomePage ? 'Ver site' : 'Visualizar'}</span>
          </button>
        ) : null}
      </div>

      <div className="editor-topbar-actions editor-topbar-actions-mobile">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label="Abrir menu de ações"
          title="Menu"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
        {mobileMenuOpen && (
          <div className="editor-mobile-menu">
            {onConfigurePage && (
              <button
                type="button"
                onClick={() => {
                  onConfigurePage();
                  closeMobileMenu();
                }}
              >
                <FontAwesomeIcon icon={faGear} />
                <span>Configurar página</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSaveDraft();
                closeMobileMenu();
              }}
              disabled={busy}
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
              <span>{isHomePage ? 'Salvar home' : 'Salvar'}</span>
            </button>
            {!isHomePage && (
              <button
                type="button"
                onClick={() => {
                  status === 'draft' ? onPublish() : onMoveToDraft();
                  closeMobileMenu();
                }}
                disabled={busy || (status === 'draft' && isNew)}
              >
                <FontAwesomeIcon icon={status === 'draft' ? faUpload : faFileLines} />
                <span>{status === 'draft' ? 'Publicar' : 'Rascunho'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
