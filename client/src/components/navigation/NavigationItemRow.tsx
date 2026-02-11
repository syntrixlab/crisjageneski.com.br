import { IconButton } from '../AdminUI';
import type { NavbarItem } from '../../types';

type NavigationItemRowProps = {
  item: NavbarItem;
  depth?: number;
  onToggleNavbar: () => void;
  onToggleFooter: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  parentOptions: { id: string; label: string }[];
  currentParentId: string | null;
  onChangeParent: (parentId: string | null) => void;
  showParentSelect: boolean;
};

export function NavigationItemRow({
  item,
  depth = 0,
  onToggleNavbar,
  onToggleFooter,
  onToggleVisible,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
  parentOptions,
  currentParentId,
  onChangeParent,
  showParentSelect
}: NavigationItemRowProps) {
  const resolveHref = () => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  const renderChip = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      className={`nav-chip-toggle ${active ? 'is-active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="nav-row-wrapper" aria-label={`Item ${item.label}`}>
      <div className={`nav-row ${depth > 0 ? 'is-child' : ''}`}>
        <div className="nav-left-controls">
          <div className="nav-reorder">
            <IconButton icon="arrow-up" label="Mover para cima" onClick={onMoveUp} disabled={disableUp} />
            <IconButton icon="arrow-down" label="Mover para baixo" onClick={onMoveDown} disabled={disableDown} />
          </div>
        </div>
        <div className="nav-row-body">
          <div className="nav-row-header">
            <div className="nav-row-title">
              <strong>{item.label}</strong>
              {item.showInNavbar && item.showInFooter && <span className="nav-chip-soft">Ambos</span>}
              {!item.isVisible && <span className="nav-chip-soft muted">Oculto</span>}
            </div>
            <div className="nav-row-actions">
              <IconButton
                icon={item.isVisible ? 'eye' : 'eye-off'}
                label={item.isVisible ? 'Ocultar' : 'Mostrar'}
                onClick={onToggleVisible}
              />
              <IconButton icon="edit" label="Editar" tone="info" onClick={onEdit} />
              <IconButton icon="trash" label="Excluir" tone="danger" onClick={onDelete} />
            </div>
          </div>
          <div className="nav-row-meta">
            <span className="muted small">{resolveHref()}</span>
            <div className="nav-chip-group">
              {renderChip('Navbar', item.showInNavbar, onToggleNavbar)}
              {renderChip('Rodapé', item.showInFooter, onToggleFooter)}
            </div>
          </div>
          {showParentSelect ? (
            <div className="nav-parent-select">
              <label>Submenu de</label>
              <select
                value={currentParentId ?? ''}
                onChange={(e) => onChangeParent(e.target.value ? e.target.value : null)}
                aria-label="Selecionar pai"
              >
                <option value="">Nenhum (nível raiz)</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id} disabled={option.id === item.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
