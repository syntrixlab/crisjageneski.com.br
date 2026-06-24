import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { ConfirmModal } from '@/components/AdminUI';
import { canAddSideAtIndex, sortBlocksByRowIndex } from '@/utils/pageLayoutHelpers';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import type { PageBlock, PageSection } from '@/types';
import { EditableBlock } from './EditableBlock';
import { SectionToolbar } from './SectionToolbar';
import { SortableBlock } from './SortableBlock';
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
  onReorderBlocksInColumn: (columnIndex: number, orderedBlockIds: string[]) => void;
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
    onReorderBlocksInColumn,
    dragHandle
  } = _props;

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const background = (section.settings?.backgroundStyle || section.settings?.background || 'none') as 'none' | 'soft' | 'dark' | 'earthy';
  const isSectionHidden = section.settings?.hidden ?? false;
  const customBg = section.settings?.backgroundColor;
  const gapMapEditor: Record<string, string> = { sm: '0.75rem', md: '1rem', lg: '2rem' };
  const editorGap = section.settings?.columnGap ? gapMapEditor[section.settings.columnGap] : '1rem';
  const alignMapEditor: Record<string, string> = { top: 'flex-start', center: 'flex-start', bottom: 'flex-start' };
  const editorAlign = section.settings?.verticalAlign ? alignMapEditor[section.settings.verticalAlign] : 'flex-start';
  const columnsCount = getSectionColumnCount(section);

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    for (let colIdx = 0; colIdx < section.cols.length; colIdx++) {
      const sorted = sortBlocksByRowIndex(section.cols[colIdx].blocks);
      const blockIds = sorted.map((b) => b.id);
      const activeIdx = blockIds.indexOf(activeId);
      if (activeIdx < 0) continue;
      const overIdx = blockIds.indexOf(overId);
      if (overIdx >= 0) {
        const newOrder = arrayMove(blockIds, activeIdx, overIdx);
        onReorderBlocksInColumn(colIdx, newOrder);
      }
      break;
    }
  };

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

      <DndContext
        sensors={blockSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleBlockDragEnd}
      >
        <div
          className="page-editor-columns"
          style={{
            gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
            gap: editorGap,
            alignItems: editorAlign
          }}
        >
          {section.cols.map((col, colIndex) => {
            const sortedBlocks = sortBlocksByRowIndex(col.blocks);
            return (
              <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
                {columnsCount > 1 && (
                  <div className="page-col-header">
                    <strong>Coluna {colIndex + 1}</strong>
                  </div>
                )}

                <SortableContext
                  items={sortedBlocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedBlocks.map((block, blockIdx) => {
                    const isLocked = block.isLocked || block.type === 'hero';
                    const canAddSide = canAddSideAtIndex({
                      columns: section.cols,
                      fromColumnIndex: colIndex,
                      fromIndex: blockIdx,
                      direction: 'right'
                    });
                    return (
                      <SortableBlock key={block.id} id={block.id} disabled={isLocked}>
                        <div className="page-block-wrapper">
                          <EditableBlock
                            block={block}
                            isSelected={selectedBlockId === block.id}
                            onSelect={() => onEditBlock(colIndex, block, blockIdx)}
                            onDelete={() => !isLocked && onDeleteBlock(colIndex, block)}
                            onDuplicate={() => onDuplicateBlock(colIndex, block.id)}
                            onMoveUp={() => !isLocked && onMoveBlock(colIndex, block.id, 'up')}
                            onMoveDown={() => !isLocked && onMoveBlock(colIndex, block.id, 'down')}
                            onMoveColumn={() => onMoveBlockColumn(colIndex, blockIdx, block)}
                            onToggleVisible={() => onToggleBlockVisible(colIndex, block)}
                            onAddSide={() => onAddBlockSide(colIndex, blockIdx)}
                            canAddSide={canAddSide}
                            disableMoveUp={isLocked || blockIdx === 0}
                            disableMoveDown={isLocked || blockIdx === sortedBlocks.length - 1}
                          />
                        </div>
                      </SortableBlock>
                    );
                  })}
                </SortableContext>

                {sortedBlocks.length === 0 && (
                  <div className="admin-empty" style={{ fontSize: '0.85rem' }}>
                    Sem blocos nesta coluna.
                  </div>
                )}

                <AddBlockButton onClick={() => onAddBlock(colIndex, sortedBlocks.length)} />
              </div>
            );
          })}
        </div>
      </DndContext>

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
