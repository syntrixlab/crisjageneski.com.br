import { v4 as uuidv4 } from 'uuid';
import type { PageLayout, PageLayoutV1, PageLayoutV2, PageSection, PageBlock, CardBlockData } from '../types';
import { normalizeBlocks } from './heroMigration';

const isValidRowIndex = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

export function getBlockRowIndex(block: PageBlock, fallbackIndex: number): number {
  return isValidRowIndex((block as any).rowIndex) ? Number((block as any).rowIndex) : fallbackIndex;
}

const sortBlocksByRowIndex = (blocks: PageBlock[]): PageBlock[] =>
  blocks
    .map((block, index) => ({
      block,
      rowIndex: getBlockRowIndex(block, index),
      originalIndex: index
    }))
    .sort((a, b) => a.rowIndex - b.rowIndex || a.originalIndex - b.originalIndex)
    .map(({ block }) => block);

const getMaxRowIndex = (blocks: PageBlock[]): number =>
  blocks.reduce((max, block, index) => Math.max(max, getBlockRowIndex(block, index)), -1);

const shiftBlocksAtOrAfter = (blocks: PageBlock[], startRow: number): PageBlock[] =>
  blocks.map((block, index) => {
    const rowIndex = getBlockRowIndex(block, index);
    if (rowIndex >= startRow) {
      return { ...block, rowIndex: rowIndex + 1 };
    }
    return block;
  });

const appendBlocksAtEnd = (targetBlocks: PageBlock[], extraBlocks: PageBlock[]): PageBlock[] => {
  if (extraBlocks.length === 0) return targetBlocks;
  const startRow = getMaxRowIndex(targetBlocks) + 1;
  const adjusted = extraBlocks.map((block, index) => ({
    ...block,
    rowIndex: startRow + index
  }));
  return [...targetBlocks, ...adjusted];
};

/**
 * Deep clones a block and generates new IDs for all nested items
 */
function deepCloneBlock(block: PageBlock): PageBlock {
  const cloned = JSON.parse(JSON.stringify(block)) as PageBlock;
  cloned.id = uuidv4();
  cloned.colSpan = block.colSpan ?? 1;
  
  // Generate new IDs for nested items (e.g., cards)
  if (cloned.type === 'cards' && cloned.data.items) {
    const cardData = cloned.data as CardBlockData;
    cardData.items = cardData.items.map((item) => ({
      ...item,
      id: uuidv4()
    }));
  }
  
  if (cloned.type === 'form' && cloned.data.fields) {
    cloned.data.fields = cloned.data.fields.map((field) => ({
      ...field,
      id: uuidv4()
    }));
  }

  if (cloned.type === 'services' && cloned.data.items) {
    cloned.data.items = cloned.data.items.map((item) => ({
      ...item,
      id: uuidv4()
    }));
  }
  
  return cloned;
}

/**
 * Deep clones a section and generates new IDs for section, columns, and all blocks
 */
function deepCloneSection(section: PageSection): PageSection {
  const cloned: PageSection = {
    ...section,
    id: uuidv4(),
    cols: section.cols.map((col) => ({
      ...col,
      id: uuidv4(),
      blocks: col.blocks.map(deepCloneBlock)
    }))
  };
  
  return cloned;
}

/**
 * Ensures layout is in V2 format, migrating from V1 if necessary
 */
export function ensureLayoutV2(layout?: PageLayout): PageLayoutV2 {
  if (!layout) return { version: 2, sections: [] };

  const normalizeCols = (section: PageSection): PageSection => {
    const desired =
      (section.settings as any)?.columnsLayout ??
      (section.columnsLayout as 2 | 3 | undefined) ??
      section.columns ??
      2;
    const columns = Math.min(3, Math.max(1, desired)) as 1 | 2 | 3;

    const cols = Array.from({ length: columns }, (_v, index) => ({
      id: section.cols?.[index]?.id ?? `col-${index + 1}`,
      blocks: normalizeBlocks(section.cols?.[index]?.blocks ?? [])
    }));

    // Move blocks from removed columns (if any) to the last visible column
    (section.cols ?? []).slice(columns).forEach((col) => {
      cols[columns - 1].blocks = appendBlocksAtEnd(cols[columns - 1].blocks, col.blocks ?? []);
    });

    const columnsLayout = columns >= 2 ? (columns as 2 | 3) : undefined;

    return {
      ...section,
      columns,
      columnsLayout,
      cols: cols.map((col) => ({ ...col, blocks: sortBlocksByRowIndex(col.blocks) })),
      settings: {
        ...(section.settings ?? {}),
        backgroundStyle: section.settings?.backgroundStyle ?? section.settings?.background,
        density: section.settings?.density ?? section.settings?.padding,
        width: section.settings?.width ?? section.settings?.maxWidth,
        columnsLayout: section.settings?.columnsLayout ?? columnsLayout
      }
    };
  };

  if (layout.version === 2) {
    return {
      version: 2,
      sections: (layout.sections ?? []).map((section) => normalizeCols(section as PageSection))
    };
  }

  // Migrate V1 to V2
  const v1 = layout as PageLayoutV1;
  const columns = Math.min(3, Math.max(1, v1.columns)) as 1 | 2 | 3;
  const cols = Array.from({ length: columns }, (_v, index) => ({
    id: v1.cols?.[index]?.id ?? `col-${index + 1}`,
    blocks: normalizeBlocks(v1.cols?.[index]?.blocks ?? [])
  }));

  // Preserve blocks from extra columns
  v1.cols?.slice(columns).forEach((col) => {
    cols[columns - 1].blocks = appendBlocksAtEnd(cols[columns - 1].blocks, col.blocks ?? []);
  });

  return {
    version: 2,
    sections: [
      normalizeCols({
        id: uuidv4(),
        columns,
        columnsLayout: (columns === 1 ? undefined : (columns as 2 | 3 | undefined)),
        cols: cols.map((col) => ({ ...col, blocks: sortBlocksByRowIndex(col.blocks) })),
        settings: {}
      })
    ]
  };
}

/**
 * Creates an empty V2 layout
 */
export function createEmptyLayoutV2(): PageLayoutV2 {
  return {
    version: 2,
    sections: []
  };
}

/**
 * Creates a new section
 */
export function createSection(columns: 1 | 2 | 3 = 2): PageSection {
  return {
    id: uuidv4(),
    columns,
    columnsLayout: (columns === 1 ? undefined : (columns as 2 | 3 | undefined)),
    cols: Array.from({ length: columns }, (_v, index) => ({
      id: `col-${index + 1}`,
      blocks: []
    })),
    settings: {}
  };
}

/**
 * Adds a section to the layout at a specific index
 */
export function addSection(layout: PageLayoutV2, section: PageSection, index?: number): PageLayoutV2 {
  const sections = [...layout.sections];
  if (index !== undefined && index >= 0 && index <= sections.length) {
    sections.splice(index, 0, section);
  } else {
    sections.push(section);
  }
  return { ...layout, sections };
}

/**
 * Removes a section from the layout
 */
export function removeSection(layout: PageLayoutV2, sectionId: string): PageLayoutV2 {
  return {
    ...layout,
    sections: layout.sections.filter((s) => s.id !== sectionId)
  };
}

/**
 * Moves a section up or down
 */
export function moveSection(layout: PageLayoutV2, sectionId: string, direction: 'up' | 'down'): PageLayoutV2 {
  const sections = [...layout.sections];
  const index = sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return layout;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sections.length) return layout;

  [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
  return { ...layout, sections };
}

/**
 * Changes the number of columns in a section, preserving blocks
 */
export function changeSectionColumns(layout: PageLayoutV2, sectionId: string, newColumns: 1 | 2 | 3): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = Array.from({ length: newColumns }, (_v, index) => ({
      id: section.cols[index]?.id ?? `col-${index + 1}`,
      blocks: (section.cols[index]?.blocks ?? []).map((b) => ({
        ...b,
        colSpan: Math.min(Math.max(b.colSpan ?? 1, 1), newColumns)
      } as PageBlock))
    }));

    // Move blocks from removed columns to the last visible column
    section.cols.slice(newColumns).forEach((col) => {
      const adjusted = (col.blocks ?? []).map((b) => ({
        ...b,
        colSpan: Math.min(Math.max(b.colSpan ?? 1, 1), newColumns)
      } as PageBlock));
      cols[newColumns - 1].blocks = appendBlocksAtEnd(cols[newColumns - 1].blocks, adjusted);
    });

    const columnsLayout = newColumns >= 2 ? (newColumns as 2 | 3) : undefined;
    return {
      ...section,
      columns: newColumns,
      columnsLayout,
      cols: cols.map((col) => ({ ...col, blocks: sortBlocksByRowIndex(col.blocks) })),
      settings: {
        ...(section.settings ?? {}),
        columnsLayout
      }
    };
  });

  return { ...layout, sections };
}

/**
 * Adds a block to a section column
 */
export function addBlockToSection(
  layout: PageLayoutV2,
  sectionId: string,
  columnIndex: number,
  block: PageBlock,
  insertIndex?: number,
  placement: 'insert' | 'place' = 'insert'
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex !== columnIndex) return col;

      const ordered = sortBlocksByRowIndex(col.blocks);
      const resolvedRow =
        insertIndex !== undefined && insertIndex >= 0 ? insertIndex : block.rowIndex ?? getMaxRowIndex(ordered) + 1;
      const nextBlock = { ...block, rowIndex: resolvedRow };
      const shifted =
        insertIndex !== undefined && placement === 'insert' ? shiftBlocksAtOrAfter(ordered, resolvedRow) : ordered;
      const nextBlocks = sortBlocksByRowIndex([...shifted, nextBlock]);

      return { ...col, blocks: nextBlocks };
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

/**
 * Removes a block from a section column
 */
export function removeBlockFromSection(
  layout: PageLayoutV2,
  sectionId: string,
  columnIndex: number,
  blockId: string
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex !== columnIndex) return col;
      const target = col.blocks.find((b) => b.id === blockId);
      if (target?.type === 'hero') return col;
      return { ...col, blocks: col.blocks.filter((b) => b.id !== blockId) };
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

/**
 * Updates a block in a section column
 */
export function updateBlockInSection(
  layout: PageLayoutV2,
  sectionId: string,
  columnIndex: number,
  blockId: string,
  updatedBlock: PageBlock
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex !== columnIndex) return col;
      return {
        ...col,
        blocks: col.blocks.map((b) =>
          b.id === blockId ? { ...updatedBlock, rowIndex: updatedBlock.rowIndex ?? b.rowIndex } : b
        )
      };
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

/**
 * Moves a block up or down within a column
 */
export function moveBlockInColumn(
  layout: PageLayoutV2,
  sectionId: string,
  columnIndex: number,
  blockId: string,
  direction: 'up' | 'down'
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex !== columnIndex) return col;

      const ordered = sortBlocksByRowIndex(col.blocks);
      const entries = ordered.map((block, index) => ({
        block,
        rowIndex: getBlockRowIndex(block, index)
      }));
      const current = entries.find((entry) => entry.block.id === blockId);
      if (!current) return col;

      const targetRow = direction === 'up' ? current.rowIndex - 1 : current.rowIndex + 1;
      if (targetRow < 0) return col;

      const target = entries.find((entry) => entry.rowIndex === targetRow);
      const nextBlocks = ordered.map((block) => {
        if (block.id === current.block.id) {
          return { ...block, rowIndex: targetRow };
        }
        if (target && block.id === target.block.id) {
          return { ...block, rowIndex: current.rowIndex };
        }
        return block;
      });

      return { ...col, blocks: sortBlocksByRowIndex(nextBlocks) };
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

/**
 * Moves a block to a different column within the same section
 */
export function moveBlockToColumn(
  layout: PageLayoutV2,
  sectionId: string,
  fromColumnIndex: number,
  toColumnIndex: number,
  blockId: string
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const fromCol = section.cols[fromColumnIndex];
    const toCol = section.cols[toColumnIndex];
    if (!fromCol || !toCol) return section;

    const block = fromCol.blocks.find((b) => b.id === blockId);
    if (!block) return section;
    const clampedBlock = {
      ...block,
      colSpan: Math.min(Math.max(block.colSpan ?? 1, 1), section.columns)
    };

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex === fromColumnIndex) {
        return { ...col, blocks: col.blocks.filter((b) => b.id !== blockId) };
      }
      if (colIndex === toColumnIndex) {
        const ordered = sortBlocksByRowIndex(col.blocks);
        const nextRow = getMaxRowIndex(ordered) + 1;
        const nextBlock = { ...clampedBlock, rowIndex: nextRow };
        return { ...col, blocks: sortBlocksByRowIndex([...ordered, nextBlock]) };
      }
      return col;
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

/**
 * Duplicates a section by ID and inserts it below the original
 */
export function duplicateSection(
  layout: PageLayoutV2,
  sectionId: string
): PageLayoutV2 {
  const sectionIndex = layout.sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) return layout;

  const originalSection = layout.sections[sectionIndex];
  const duplicatedSection = deepCloneSection(originalSection);

  const sections = [
    ...layout.sections.slice(0, sectionIndex + 1),
    duplicatedSection,
    ...layout.sections.slice(sectionIndex + 1),
  ];

  return { ...layout, sections };
}

/**
 * Duplicates a block by ID within a section and inserts it below the original
 */
export function duplicateBlock(
  layout: PageLayoutV2,
  sectionId: string,
  columnIndex: number,
  blockId: string
): PageLayoutV2 {
  const sections = layout.sections.map((section) => {
    if (section.id !== sectionId) return section;

    const cols = section.cols.map((col, colIndex) => {
      if (colIndex !== columnIndex) return col;

      const ordered = sortBlocksByRowIndex(col.blocks);
      const blockIndex = ordered.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return col;

      const originalBlock = ordered[blockIndex];
      const originalRow = getBlockRowIndex(originalBlock, blockIndex);
      const insertRow = originalRow + 1;
      const shifted = shiftBlocksAtOrAfter(ordered, insertRow);
      const duplicatedBlock = { ...deepCloneBlock(originalBlock), rowIndex: insertRow };

      return { ...col, blocks: sortBlocksByRowIndex([...shifted, duplicatedBlock]) };
    });

    return { ...section, cols };
  });

  return { ...layout, sections };
}

export function resolveSideTargetColumnIndex(_props: {
  columns: Array<{ blocks: PageBlock[] }>;
  fromColumnIndex: number;
  direction: 'right' | 'left';
}): number | null {
  const { columns, fromColumnIndex, direction } = _props;
  const columnsCount = columns.length;
  if (columnsCount < 2) return null;
  if (columnsCount === 2) return fromColumnIndex === 0 ? 1 : 0;
  if (columnsCount === 3) {
    if (direction === 'right') {
      if (fromColumnIndex === 0) return 1;
      if (fromColumnIndex === 1) return 2;
      return 1;
    }
    if (fromColumnIndex === 2) return 1;
    if (fromColumnIndex === 1) return 0;
    return 1;
  }
  return null;
}

export function canAddSideAtIndex(_props: {
  columns: Array<{ blocks: PageBlock[] }>;
  fromColumnIndex: number;
  fromIndex: number;
  direction: 'right' | 'left';
}): boolean {
  const { columns, fromColumnIndex, fromIndex, direction } = _props;
  const targetColumnIndex = resolveSideTargetColumnIndex({ columns, fromColumnIndex, direction });
  if (targetColumnIndex === null) return false;
  const targetColumn = columns[targetColumnIndex];
  if (!targetColumn) return false;

  return !targetColumn.blocks.some((block, index) => getBlockRowIndex(block, index) === fromIndex);
}
