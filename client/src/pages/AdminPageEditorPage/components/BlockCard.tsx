import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '@/components/AdminUI';
import { PageBlockView } from '@/components/PageRenderer';
import { blockRegistry } from '@/blocks/registry';
import type { BlockType, PageBlock } from '@/types';

export function BlockCard(_props: {
  block: PageBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveColumn: () => void;
  onAddSide: () => void;
  canAddSide: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const {
    block,
    onEdit,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveColumn,
    onAddSide,
    canAddSide,
    disableMoveUp,
    disableMoveDown
  } = _props;
  const label = blockRegistry[block.type as BlockType]?.label ?? block.type;

  // Hero V2 é fixo: não pode ser movido ou deletado
  const isHero = block.type === 'hero';

  return (
    <div className="page-block-card admin-card">
      <div className="page-block-card-header">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            {label}
            {isHero && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>(fixo)</span>}
          </p>
        </div>
        <div className="admin-actions" style={{ gap: '0.35rem' }}>
          {!isHero && <IconButton icon="arrow-up" label="Mover para cima" onClick={onMoveUp} disabled={disableMoveUp} />}
          {!isHero && <IconButton icon="arrow-down" label="Mover para baixo" onClick={onMoveDown} disabled={disableMoveDown} />}
          <IconButton icon="edit" label="Editar" tone="info" onClick={onEdit} />
          {!isHero && <IconButton icon="globe" label="Mover coluna" onClick={onMoveColumn} />}
          {!isHero && canAddSide && (
            <button
              type="button"
              onClick={onAddSide}
              className="icon-btn"
              title="Adicionar ao lado"
              style={{
                padding: '0.35rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s'
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}
          {!isHero && <IconButton icon="copy" label="Duplicar" onClick={onDuplicate} />}
          {!isHero && <IconButton icon="trash" label="Remover" tone="danger" onClick={onDelete} />}
        </div>
      </div>
      <div className="page-block-card-body">
        <PageBlockView block={block} />
      </div>
    </div>
  );
}
