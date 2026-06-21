import React from 'react';
import type { PageBlock, PageLayout, PageLayoutV2, PageSection } from '../types';
import type { BlockType } from '../types';
import { ensureLayoutV2, getSectionColumnCount } from '../utils/pageLayoutHelpers';
import { calculateBlockSpan } from '../utils/columnSpan';
import { organizeSectionBlocksIntoRows } from '../utils/blockGridHelpers';
import { blockRegistry } from '@/blocks/registry';
import { BlockErrorBoundary } from './BlockErrorBoundary';

type BlockPosition = {
  block: PageBlock;
  colStart: number; // 1-indexed
  colSpan: number;
  rowStart: number; // 1-indexed
  rowSpan: number;
};

// Se um bloco ocupa colunas X..Y e não há blocos nas rows abaixo que interseccionem esse intervalo,
// o bloco deve spannar essas rows (caso do formulário na página de Contato).
function calculateRowSpan(
  rowIndex: number,
  colStart: number,
  colEnd: number,
  allRows: ReturnType<typeof organizeSectionBlocksIntoRows>
): number {
  let span = 1;

  for (let r = rowIndex + 1; r < allRows.length; r++) {
    const row = allRows[r];

    const hasIntersection = row.cells.some(cell => {
      if (!cell) return false;

      const cellColStart = cell.colIndex + 1;
      const cellColSpan = (cell.block as Record<string, unknown>).colSpan as number ?? 1;
      const cellColEnd = cellColStart + cellColSpan - 1;

      return !(cellColEnd < colStart || cellColStart > colEnd);
    });

    if (hasIntersection) break;

    span++;
  }

  return span;
}

function isRenderableBlock(block: PageBlock): boolean {
  if (!block) return false;
  if (block.visible === false) return false;

  const blockData = block.data as Record<string, unknown>;
  if (blockData?.kind === 'placeholder') return false;
  if (blockData?.isPlaceholder) return false;
  if (block.id?.includes('empty-row')) return false;

  return true;
}

type RendererProps = {
  layout?: PageLayout;
  className?: string;
  pageSlug?: string;
};

export function PageRenderer({ layout, className, pageSlug }: RendererProps) {
  const normalized = ensureLayoutV2(layout);

  if (!normalized.sections || normalized.sections.length === 0) {
    return <div className={`page-public-content ${className ?? ''}`.trim()}>Nenhum conteúdo disponível.</div>;
  }

  return (
    <div className={`page-public-content ${className ?? ''}`.trim()}>
      {normalized.sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} sectionIndex={index} pageSlug={pageSlug} />
      ))}
    </div>
  );
}

type PageRendererCoreProps = {
  layout: PageLayoutV2;
  className?: string;
  enableFormSubmit?: boolean;
  pageSlug?: string;
};

export function PageRendererCore({ layout, className = '', enableFormSubmit = true, pageSlug }: PageRendererCoreProps) {
  if (!layout.sections || layout.sections.length === 0) {
    return <div className={`page-public-content ${className}`.trim()}>Nenhum conteúdo disponível.</div>;
  }

  return (
    <div className={`page-public-content ${className}`.trim()}>
      {layout.sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} sectionIndex={index} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
      ))}
    </div>
  );
}

function SectionRenderer({ section, sectionIndex, enableFormSubmit = true, pageSlug }: { section: PageSection; sectionIndex: number; enableFormSubmit?: boolean; pageSlug?: string }) {
  const settings = section.settings ?? {};
  const background = (settings.backgroundStyle as string) || (settings.background as string) || 'none';
  const backgroundClass =
    background === 'soft'
      ? 'section-bg-soft'
      : background === 'dark'
        ? 'section-bg-dark'
        : background === 'earthy'
          ? 'section-bg-earthy'
          : 'section-bg-none';

  const density = (settings.density as string) || (settings.padding as string) || 'normal';
  const paddingClass = `section-padding-${density}`;

  const width = (settings.width as string) || (settings.maxWidth as string) || 'normal';
  const maxWidthClass = `section-maxwidth-${width}`;

  const height = (settings.height as string) || 'normal';
  const heightClass = height === 'tall' ? 'section-height-tall' : '';

  const hasHero = section.cols.some((col) => col.blocks.some((b) => b.type === 'hero'));
  const containerClass = hasHero ? 'container container--flush' : 'container';
  const columnCount = getSectionColumnCount(section);
  const effectiveColumns = hasHero ? 1 : columnCount;

  const shouldApplyContainer = (background === 'soft' || background === 'dark' || background === 'earthy') && !hasHero;
  const sectionContainerClass = shouldApplyContainer ? 'section-container' : '';

  const rows = organizeSectionBlocksIntoRows(section);

  if (rows.length === 0) return null;

  const blockPositions: BlockPosition[] = [];

  rows.forEach((row, rowIdx) => {
    row.cells.forEach(cell => {
      if (!cell) return;

      const { block, colIndex } = cell;
      const colStart = colIndex + 1;
      const colSpan = calculateBlockSpan(block, effectiveColumns);
      const rowStart = rowIdx + 1;
      const colEnd = colStart + colSpan - 1;
      const rowSpan = calculateRowSpan(rowIdx, colStart, colEnd, rows);

      blockPositions.push({ block, colStart, colSpan, rowStart, rowSpan });
    });
  });

  return (
    <section className={`page-public-section ${backgroundClass} ${paddingClass} ${maxWidthClass} ${heightClass}`.trim()} data-section-index={sectionIndex}>
      <div className={containerClass}>
        <div
          className={`page-public-grid ${sectionContainerClass} cols-${effectiveColumns}`.trim()}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
            gap: 'var(--space-6)',
            alignItems: 'start',
            gridAutoRows: 'auto'
          }}
        >
          {blockPositions.map((pos) => {
            if (!isRenderableBlock(pos.block)) return null;

            return (
              <div
                key={pos.block.id}
                className="page-public-block"
                style={{
                  gridColumn: `${pos.colStart} / span ${pos.colSpan}`,
                  gridRow: `${pos.rowStart} / span ${pos.rowSpan}`
                }}
              >
                <PageBlockView block={pos.block} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PageBlockView({ block, enableFormSubmit = true, pageSlug }: { block: PageBlock; enableFormSubmit?: boolean; pageSlug?: string }) {
  if (!block) return null;

  const config = blockRegistry[block.type as BlockType];
  if (!config) return null;

  const Renderer = config.renderer as React.ComponentType<{
    data: unknown;
    blockId?: string;
    pageSlug?: string;
    enableFormSubmit?: boolean;
    renderChild?: (b: PageBlock) => React.ReactNode;
  }>;

  const renderChild = (childBlock: PageBlock): React.ReactNode => {
    const childConfig = blockRegistry[childBlock.type as BlockType];
    if (!childConfig) return null;
    const ChildRenderer = childConfig.renderer as typeof Renderer;
    return (
      <ChildRenderer
        key={childBlock.id}
        data={childBlock.data}
        blockId={childBlock.id}
        pageSlug={pageSlug}
        enableFormSubmit={enableFormSubmit}
        renderChild={renderChild}
      />
    );
  };

  return (
    <BlockErrorBoundary>
      <Renderer
        data={block.data}
        blockId={block.id}
        pageSlug={pageSlug}
        enableFormSubmit={enableFormSubmit}
        renderChild={renderChild}
      />
    </BlockErrorBoundary>
  );
}
