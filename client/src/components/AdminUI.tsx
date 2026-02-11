import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Media, NavbarItem } from '../types';
import '../App.css';

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string | number;
};

export function Modal({ isOpen, title, description, onClose, children, footer, width = 560 }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !isOpen) return null;

  return ReactDOM.createPortal(
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="admin-modal" style={{ width }}>
        <div className="admin-modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p className="muted" style={{ margin: '0.2rem 0 0' }}>{description}</p>}
          </div>
          <button className="admin-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

type IconButtonProps = {
  icon: 'edit' | 'trash' | 'publish' | 'unpublish' | 'eye' | 'eye-off' | 'globe' | 'arrow-up' | 'arrow-down' | 'copy';
  onClick: () => void;
  label: string;
  tone?: 'default' | 'danger' | 'info';
  disabled?: boolean;
};

export function IconButton({ icon, onClick, label, tone = 'default', disabled }: IconButtonProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'edit':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        );
      case 'trash':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M14 10v8" />
            <path d="M10 10v8" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        );
      case 'publish':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
            <path d="M12 3v14" />
            <path d="m6 9 6-6 6 6" />
          </svg>
        );
      case 'unpublish':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M3 3l18 18" />
            <path d="M4 17v2a1 1 0 0 0 1 1h11" />
            <path d="m6 9 6-6 6 6" />
          </svg>
        );
      case 'eye':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case 'eye-off':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="m3 3 18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.5 5.3A10.5 10.5 0 0 1 12 5c7 0 11 7 11 7a13 13 0 0 1-4.2 4.9" />
            <path d="M6.7 6.7A13 13 0 0 0 1 12s4 7 11 7a10.9 10.9 0 0 0 5.4-1.4" />
          </svg>
        );
      case 'globe':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" />
          </svg>
        );
      case 'arrow-up':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M12 5v14" />
            <path d="m6 11 6-6 6 6" />
          </svg>
        );
      case 'arrow-down':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M12 5v14" />
            <path d="m6 13 6 6 6-6" />
          </svg>
        );
      case 'copy':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        );
      default:
        return null;
    }
  };
  return (
    <button
      className={`icon-button tone-${tone}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {renderIcon()}
    </button>
  );
}

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  loading
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} title={title} description={description} onClose={onClose} width={420}>
      <div className="admin-modal-footer">
        <button className="btn btn-outline" onClick={onClose} type="button">
          {cancelLabel}
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={loading} type="button">
          {loading ? 'Excluindo...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  id?: string;
};

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <label className="admin-switch" htmlFor={id}>
      {label && <span>{label}</span>}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        className={`admin-switch-control ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <span className="admin-switch-thumb" />
      </button>
    </label>
  );
}

type MediaGalleryProps = {
  items: Media[];
  onEdit: (media: Media) => void;
  onDelete: (media: Media) => void;
};

export function MediaGallery({ items, onEdit, onDelete }: MediaGalleryProps) {
  return (
    <div className="admin-gallery">
      {items.map((item) => (
        <div key={item.id} className="admin-media-card">
          <div className="admin-media-preview">
            <img src={item.url} alt={item.alt ?? ''} />
          </div>
          <div className="admin-media-meta">
            <strong style={{ color: 'var(--color-deep)' }}>{item.alt || 'Sem alt'}</strong>
          </div>
          <div className="admin-actions admin-media-actions">
            <IconButton icon="edit" label="Editar" tone="info" onClick={() => onEdit(item)} />
            <IconButton icon="trash" label="Remover" tone="danger" onClick={() => onDelete(item)} />
          </div>
        </div>
      ))}
    </div>
  );
}

type NavbarDragListProps = {
  items: NavbarItem[];
  context: 'navbar' | 'footer';
  onReorder: (items: NavbarItem[]) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
  onToggleVisible?: (item: NavbarItem) => void;
};

export function NavbarDragList({ items, context, onReorder, onEdit, onDelete, onToggleVisible }: NavbarDragListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);

  const orderKey = context === 'navbar' ? 'orderNavbar' : 'orderFooter';
  const sorted = [...items].sort((a, b) => ((a as any)[orderKey] ?? 0) - ((b as any)[orderKey] ?? 0));

  const formatHref = (item: NavbarItem) => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return key ? `/p/${key}` : '';
  };

  const reorder = (list: NavbarItem[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, index) => ({ ...item, [orderKey]: index } as NavbarItem));
  };

  return (
    <div className="admin-drag-list">
      {sorted.map((item, index) => (
        <div
          key={item.id}
          className={`admin-drag-item ${draggingId === item.id ? 'is-dragging' : ''}`}
          draggable
          onDragStart={() => {
            setDraggingId(item.id);
            setFromIndex(index);
          }}
          onDragEnd={(e) => {
            e.preventDefault();
            setDraggingId(null);
            setFromIndex(null);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (fromIndex === null) return;
            const toIndex = sorted.findIndex((i) => i.id === item.id);
            if (toIndex === -1 || toIndex === fromIndex) return;
            const next = reorder(sorted, fromIndex, toIndex);
            onReorder(next);
            setDraggingId(null);
            setFromIndex(null);
          }}
        >
          <div className="admin-drag-handle" aria-label="Mover item">::</div>
          <div className="admin-drag-content">
            <strong>{item.label}</strong>
            <span className="muted">{formatHref(item)}</span>
          </div>
          <div className="admin-actions" style={{ marginLeft: 'auto' }}>
            {onToggleVisible && (
              <IconButton
                icon={item.isVisible ? 'eye' : 'eye-off'}
                label={item.isVisible ? 'Ocultar' : 'Mostrar'}
                onClick={() => onToggleVisible(item)}
              />
            )}
            <IconButton icon="edit" label="Editar" tone="info" onClick={() => onEdit(item)} />
            <IconButton icon="trash" label="Remover" tone="danger" onClick={() => onDelete(item)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArticleStatusBadge({ status }: { status: 'draft' | 'published' }) {
  const isDraft = status === 'draft';
  return (
    <span
      className="admin-chip"
      style={{
        background: isDraft ? 'rgba(118,112,76,0.12)' : 'rgba(141,43,0,0.12)',
        color: isDraft ? 'var(--color-forest)' : 'var(--color-terracotta)'
      }}
    >
      {isDraft ? 'Rascunho' : 'Publicado'}
    </span>
  );
}
