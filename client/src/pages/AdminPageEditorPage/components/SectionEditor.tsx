import { useState } from 'react';
import { ConfirmModal } from '@/components/AdminUI';
import { canAddSideAtIndex, getBlockRowIndex, getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import type { PageBlock, PageSection } from '@/types';
import { EditableBlock } from './EditableBlock';
import { SectionToolbar } from './SectionToolbar';
import type { SectionDragHandle } from './SortableSection';

function AddBlockButton(_props: { onClick: () => void; style?: React.CSSProperties; label?: string }) {
  const { onClick, style, label } = _props;
  return (
    <button type="button" className="page-add-block" onClick={onClick} style={style}>
      {label || '+ Adicionar bloco'}
    </button>
  );
}

export function SectionEditor(_props: {
  section: PageSection;
  sectionIndex: number;
  totalSections: number;
  onMoveSection: (direction: 'up' | 'down') => void;
  onRemoveSection: () => void;
  onDuplicateSection: () => void;
  onConfigureSection: () => void;
  onToggleSectionHidden: () => void;
  selectedBlockId?: string | null;
  onAddBlock: (columnIndex: number, insertIndex: number) => void;
  onAddBlockSide: (columnIndex: number, rowIndex: number) => void;
  onEditBlock: (columnIndex: number, block: PageBlock, blockIndex: number) => void;
  onMoveBlock: (columnIndex: number, blockId: string, direction: 'up' | 'down') => void;
  onMoveBlockColumn: (columnIndex: number, blockIndex: number, block: PageBlock) => void;
  onDeleteBlock: (columnIndex: number, block: PageBlock) => void;
  onDuplicateBlock: (columnIndex: number, blockId: string) => void;
  onToggleBlockVisible: (columnIndex: number, block: PageBlock) => void;
  dragHandle?: SectionDragHandle;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onMoveSection,
    onRemoveSection,
    onDuplicateSection,
    onConfigureSection,
    onToggleSectionHidden,
    selectedBlockId,
    onAddBlock,
    onAddBlockSide,
    onEditBlock,
    onMoveBlock,
    onMoveBlockColumn,
    onDeleteBlock,
    onDuplicateBlock,
    onToggleBlockVisible,
    dragHandle
  } = _props;
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const background = (section.settings?.backgroundStyle || section.settings?.background || 'none') as 'none' | 'soft' | 'dark' | 'earthy';
  const isSectionHidden = section.settings?.hidden ?? false;
  const customBg = section.settings?.backgroundColor;
  const gapMapEditor: Record<string, string> = { sm: '0.75rem', md: '1rem', lg: '2rem' };
  const editorGap = section.settings?.columnGap ? gapMapEditor[section.settings.columnGap] : '1rem';
  const alignMapEditor: Record<string, string> = { top: 'start', center: 'center', bottom: 'end' };
  const editorAlign = section.settings?.verticalAlign ? alignMapEditor[section.settings.verticalAlign] : 'start';
  const columnsCount = getSectionColumnCount(section);
  const rowCount =
    section.cols.reduce((max, col) => {
      col.blocks.forEach((block, index) => {
        max = Math.max(max, getBlockRowIndex(block, index));
      });
      return max;
    }, -1) + 1;
  const columnRows = section.cols.map((col) => {
    const map = new Map<number, { block: PageBlock; blockIndex: number }>();
    col.blocks.forEach((block, index) => {
      const rowIndex = getBlockRowIndex(block, index);
      if (!map.has(rowIndex)) {
        map.set(rowIndex, { block, blockIndex: index });
      }
    });
    return map;
  });

  return (
    <div
      id={`editor-section-${section.id}`}
      className={`page-section-editor admin-card${isSectionHidden ? ' is-hidden' : ''}`}
      style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'visible', ...(customBg ? { background: customBg } : {}) }}
      data-bg={background}
    >
      <SectionToolbar
        section={section}
        sectionIndex={sectionIndex}
        totalSections={totalSections}
        onMoveUp={() => onMoveSection('up')}
        onMoveDown={() => onMoveSection('down')}
        onSettings={onConfigureSection}
        onToggleHidden={onToggleSectionHidden}
        onDuplicate={onDuplicateSection}
        onRemove={() => setShowConfirmDelete(true)}
        dragHandle={dragHandle}
      />

      <div
        className="page-editor-columns"
        style={{ gridTemplateColumns: `repeat(${getSectionColumnCount(section)}, minmax(0, 1fr))`, gap: editorGap, alignItems: editorAlign }}
      >
        {columnsCount > 1 &&
          section.cols.map((col, colIndex) => (
            <div key={`header-${col.id}`} className="page-col-header" style={{ gridColumn: `${colIndex + 1} / span 1` }}>
              <strong>Coluna {colIndex + 1}</strong>
            </div>
          ))}

        {Array.from({ length: rowCount }).map((_, rowIndex) => {
          const blocksInRow = section.cols.map((_, colIndex) => columnRows[colIndex].get(rowIndex)).filter(Boolean);

          if (blocksInRow.length === 0) {
            return (
              <div
                key={`empty-row-${rowIndex}`}
                className="page-block-wrapper"
                style={{ gridColumn: '1 / -1', gridRow: rowIndex + 1 }}
              >
                <AddBlockButton
                  onClick={() => onAddBlock(0, rowIndex)}
                  label="+ Adicionar bloco (linha vazia)"
                />
              </div>
            );
          }

          return section.cols.map((col, colIndex) => {
            const entry = columnRows[colIndex].get(rowIndex);

            if (!entry) {
              return (
                <div
                  key={`empty-${col.id}-${rowIndex}`}
                  className="page-block-wrapper"
                  style={{ gridColumn: `${colIndex + 1} / span 1`, gridRow: rowIndex + 1 }}
                >
                  <AddBlockButton onClick={() => onAddBlock(colIndex, rowIndex)} />
                </div>
              );
            }

            const { block, blockIndex } = entry;
            const isLocked = block.isLocked || block.type === 'hero';
            const isFullWidth = block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services';
            const span = isFullWidth ? columnsCount : Math.min(block.colSpan ?? 1, columnsCount);
            const canAddSide = canAddSideAtIndex({
              columns: section.cols,
              fromColumnIndex: colIndex,
              fromIndex: rowIndex,
              direction: 'right'
            });

            return (
              <div
                key={block.id}
                className="page-block-wrapper"
                style={{
                  gridColumn: isFullWidth ? '1 / -1' : `${colIndex + 1} / span ${span}`,
                  gridRow: rowIndex + 1
                }}
              >
                <EditableBlock
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onEditBlock(colIndex, block, blockIndex)}
                  onDelete={() => !isLocked && onDeleteBlock(colIndex, block)}
                  onDuplicate={() => onDuplicateBlock(colIndex, block.id)}
                  onMoveUp={() => !isLocked && onMoveBlock(colIndex, block.id, 'up')}
                  onMoveDown={() => !isLocked && onMoveBlock(colIndex, block.id, 'down')}
                  onMoveColumn={() => onMoveBlockColumn(colIndex, blockIndex, block)}
                  onToggleVisible={() => onToggleBlockVisible(colIndex, block)}
                  onAddSide={() => onAddBlockSide(colIndex, rowIndex)}
                  canAddSide={canAddSide}
                  disableMoveUp={isLocked || rowIndex === 0}
                  disableMoveDown={isLocked || rowIndex === rowCount - 1}
                />
              </div>
            );
          });
        })}

        {rowCount === 0 &&
          section.cols.map((col, colIndex) => (
            <div
              key={`empty-${col.id}`}
              className="admin-empty"
              style={{ gridColumn: `${colIndex + 1} / span 1`, gridRow: 1 }}
            >
              Sem blocos nesta coluna.
            </div>
          ))}

        {columnsCount > 1 ? (
          <AddBlockButton
            key="add-end-fullwidth"
            onClick={() => onAddBlock(0, rowCount)}
            style={{ gridColumn: '1 / -1', gridRow: rowCount + 1 }}
            label="+ Adicionar bloco (nova linha)"
          />
        ) : (
          <AddBlockButton
            key="add-end-single"
            onClick={() => onAddBlock(0, rowCount)}
            style={{ gridColumn: '1 / span 1', gridRow: rowCount + 1 }}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção? Todos os blocos serão perdidos."
        onConfirm={() => {
          onRemoveSection();
          setShowConfirmDelete(false);
        }}
        confirmLabel="Remover"
      />
    </div>
  );
}
