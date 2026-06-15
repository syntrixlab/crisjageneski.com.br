import React, { useState } from 'react';
import { ConfirmModal, IconButton } from '@/components/AdminUI';
import { canAddSideAtIndex, getBlockRowIndex } from '@/utils/pageLayoutHelpers';
import type { PageBlock, PageSection } from '@/types';
import { BlockCard } from './BlockCard';

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
  onChangeSectionColumns: (columns: 1 | 2 | 3) => void;
  onChangeSectionBackground: (background: 'none' | 'soft' | 'dark' | 'earthy') => void;
  onChangeSectionPadding: (padding: 'normal' | 'compact' | 'large') => void;
  onChangeSectionMaxWidth: (maxWidth: 'normal' | 'wide') => void;
  onChangeSectionHeight: (height: 'normal' | 'tall') => void;
  onMoveSection: (direction: 'up' | 'down') => void;
  onRemoveSection: () => void;
  onDuplicateSection: () => void;
  onAddBlock: (columnIndex: number, insertIndex: number) => void;
  onAddBlockSide: (columnIndex: number, rowIndex: number) => void;
  onEditBlock: (columnIndex: number, block: PageBlock, blockIndex: number) => void;
  onMoveBlock: (columnIndex: number, blockId: string, direction: 'up' | 'down') => void;
  onMoveBlockColumn: (columnIndex: number, blockIndex: number, block: PageBlock) => void;
  onDeleteBlock: (columnIndex: number, block: PageBlock) => void;
  onDuplicateBlock: (columnIndex: number, blockId: string) => void;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onChangeSectionColumns,
    onChangeSectionBackground,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight,
    onMoveSection,
    onRemoveSection,
    onDuplicateSection,
    onAddBlock,
    onAddBlockSide,
    onEditBlock,
    onMoveBlock,
    onMoveBlockColumn,
    onDeleteBlock,
    onDuplicateBlock
  } = _props;
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const background = (section.settings?.backgroundStyle || section.settings?.background || 'none') as 'none' | 'soft' | 'dark' | 'earthy';
  const padding = (section.settings?.density || section.settings?.padding || 'normal') as 'normal' | 'compact' | 'large';
  const maxWidth = (section.settings?.width || section.settings?.maxWidth || 'normal') as 'normal' | 'wide';
  const height = (section.settings?.height || 'normal') as 'normal' | 'tall';
  const columnsCount = (section.settings?.columnsLayout as number) || section.columnsLayout || section.columns || 1;
  const columnOptions = section.columns === 1 ? [1, 2, 3] : [2, 3];
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

  const isHeroSection = section.kind === 'hero';

  return (
    <div className="page-section-editor admin-card" style={{ marginBottom: '1.5rem' }} data-bg={background}>
      <div className="page-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <strong>{isHeroSection ? 'Hero (Secao Fixa)' : `Secao ${sectionIndex + 1}`}</strong>
          {!isHeroSection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Colunas</span>
              <div className="page-columns-toggle compact">
                {columnOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={section.columns === c ? 'active' : ''}
                    onClick={() => onChangeSectionColumns(c as 1 | 2 | 3)}
                  >
                    {c} col{c > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'none', label: 'Sem fundo' },
                { value: 'soft', label: 'Suave' },
                { value: 'dark', label: 'Escuro' },
                { value: 'earthy', label: 'Terroso' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={background === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionBackground(opt.value as 'none' | 'soft' | 'dark' | 'earthy')}
                  title={`Fundo: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'compact', label: 'Compacto' },
                { value: 'normal', label: 'Normal' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={padding === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionPadding(opt.value as 'normal' | 'compact' | 'large')}
                  title={`Espacamento: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'normal', label: 'Altura Normal' },
                { value: 'tall', label: 'Altura Alta' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={height === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionHeight(opt.value as 'normal' | 'tall')}
                  title={`Altura: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'wide', label: 'Largo' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={maxWidth === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionMaxWidth(opt.value as 'normal' | 'wide')}
                  title={`Largura: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="admin-actions" style={{ gap: '0.35rem' }}>
          {!isHeroSection && (
            <>
              <IconButton
                icon="arrow-up"
                label="Mover secao para cima"
                onClick={() => onMoveSection('up')}
                disabled={sectionIndex === 0}
              />
              <IconButton
                icon="arrow-down"
                label="Mover secao para baixo"
                onClick={() => onMoveSection('down')}
                disabled={sectionIndex === totalSections - 1}
              />
              <IconButton icon="copy" label="Duplicar secao" onClick={onDuplicateSection} />
              <IconButton icon="trash" label="Remover secao" tone="danger" onClick={() => setShowConfirmDelete(true)} />
            </>
          )}
          {isHeroSection && (
            <span className="muted small">Esta secao nao pode ser movida ou removida</span>
          )}
        </div>
      </div>

      <div
        className="page-editor-columns"
        style={{ gridTemplateColumns: `repeat(${section.settings?.columnsLayout ?? section.columnsLayout ?? section.columns}, minmax(0, 1fr))` }}
      >
        {section.cols.map((col, colIndex) => (
          <div key={`header-${col.id}`} className="page-col-header" style={{ gridColumn: `${colIndex + 1} / span 1` }}>
            <strong>Coluna {colIndex + 1}</strong>
          </div>
        ))}

        {Array.from({ length: rowCount }).map((_, rowIndex) => {
          // Verificar quantas colunas têm blocos nesta linha
          const blocksInRow = section.cols.map((_, colIndex) => columnRows[colIndex].get(rowIndex)).filter(Boolean);

          // Se a linha está completamente vazia, renderizar 1 botão full-width
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

          // Renderizar blocos e slots vazios
          return section.cols.map((col, colIndex) => {
            const entry = columnRows[colIndex].get(rowIndex);

            if (!entry) {
              // Slot vazio em linha parcialmente preenchida
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
                <BlockCard
                  block={block}
                  onEdit={() => onEditBlock(colIndex, block, blockIndex)}
                  onDelete={() => !isLocked && onDeleteBlock(colIndex, block)}
                  onDuplicate={() => onDuplicateBlock(colIndex, block.id)}
                  onMoveUp={() => !isLocked && onMoveBlock(colIndex, block.id, 'up')}
                  onMoveDown={() => !isLocked && onMoveBlock(colIndex, block.id, 'down')}
                  onMoveColumn={() => onMoveBlockColumn(colIndex, blockIndex, block)}
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

        {/* Botão de adicionar no final - apenas 1 full-width se houver múltiplas colunas */}
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
