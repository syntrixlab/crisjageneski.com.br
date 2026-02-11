import { organizeSectionBlocksIntoRows, validateBlockOrdering } from './blockGridHelpers';
import type { PageSection, PageBlock } from '../types';

/**
 * Test suite for block grid helpers
 * Run this in console or as a unit test to verify block ordering logic
 */

// Helper to create a test block
function createTestBlock(id: string, rowIndex: number): PageBlock {
  return {
    id,
    type: 'text',
    rowIndex,
    data: { contentHtml: `Block ${id}` }
  } as PageBlock;
}

// Test 1: Simple 2-column layout with aligned rows
export function testSimpleTwoColumnLayout() {
  const section: PageSection = {
    id: 'test-section',
    columns: 2,
    cols: [
      {
        id: 'col-0',
        blocks: [
          createTestBlock('block-1', 0), // Row 0, Col 0
          createTestBlock('block-3', 1)  // Row 1, Col 0
        ]
      },
      {
        id: 'col-1',
        blocks: [
          createTestBlock('block-2', 0), // Row 0, Col 1
          createTestBlock('block-4', 1)  // Row 1, Col 1
        ]
      }
    ],
    settings: {}
  };

  const rows = organizeSectionBlocksIntoRows(section);
  
  console.log('✓ Test 1: Simple 2-column layout');
  console.log('Expected order: block-1, block-2, block-3, block-4');
  console.log('Actual rows:');
  rows.forEach((row) => {
    const blockIds = row.cells.map(cell => cell ? cell.block.id : 'empty').join(', ');
    console.log(`  Row ${row.rowIndex}: ${blockIds}`);
  });
  
  // Validate
  const validation = validateBlockOrdering(section);
  console.log('Validation:', validation.isValid ? '✓ PASS' : '✗ FAIL');
  if (!validation.isValid) {
    console.log('Issues:', validation.issues);
  }
  console.log('---');
  
  return validation.isValid;
}

// Test 2: Layout with gaps (empty cells)
export function testLayoutWithGaps() {
  const section: PageSection = {
    id: 'test-section-2',
    columns: 2,
    cols: [
      {
        id: 'col-0',
        blocks: [
          createTestBlock('block-1', 0), // Row 0, Col 0
          // (gap - no block at row 1, col 0)
          createTestBlock('block-3', 2)  // Row 2, Col 0
        ]
      },
      {
        id: 'col-1',
        blocks: [
          // (gap - no block at row 0, col 1)
          createTestBlock('block-2', 1), // Row 1, Col 1
          createTestBlock('block-4', 2)  // Row 2, Col 1
        ]
      }
    ],
    settings: {}
  };

  const rows = organizeSectionBlocksIntoRows(section);
  
  console.log('✓ Test 2: Layout with gaps');
  console.log('Expected: Row 0 has block-1 + empty, Row 1 has empty + block-2, Row 2 has block-3 + block-4');
  console.log('Actual rows:');
  rows.forEach((row) => {
    const blockIds = row.cells.map(cell => cell ? cell.block.id : 'empty').join(', ');
    console.log(`  Row ${row.rowIndex}: ${blockIds}`);
  });
  console.log('---');
  
  return rows.length === 3 && 
         rows[0].cells[0]?.block.id === 'block-1' && rows[0].cells[1] === null &&
         rows[1].cells[0] === null && rows[1].cells[1]?.block.id === 'block-2' &&
         rows[2].cells[0]?.block.id === 'block-3' && rows[2].cells[1]?.block.id === 'block-4';
}

// Test 3: Three-column layout
export function testThreeColumnLayout() {
  const section: PageSection = {
    id: 'test-section-3',
    columns: 3,
    cols: [
      {
        id: 'col-0',
        blocks: [createTestBlock('A1', 0), createTestBlock('A2', 1)]
      },
      {
        id: 'col-1',
        blocks: [createTestBlock('B1', 0), createTestBlock('B2', 1)]
      },
      {
        id: 'col-2',
        blocks: [createTestBlock('C1', 0), createTestBlock('C2', 1)]
      }
    ],
    settings: { columnsLayout: 3 }
  };

  const rows = organizeSectionBlocksIntoRows(section);
  
  console.log('✓ Test 3: Three-column layout');
  console.log('Expected: Row 0: A1, B1, C1 | Row 1: A2, B2, C2');
  console.log('Actual rows:');
  rows.forEach((row) => {
    const blockIds = row.cells.map(cell => cell ? cell.block.id : 'empty').join(', ');
    console.log(`  Row ${row.rowIndex}: ${blockIds}`);
  });
  console.log('---');
  
  return rows.length === 2 && 
         rows[0].cells.length === 3 && rows[1].cells.length === 3 &&
         rows[0].cells[0]?.block.id === 'A1' &&
         rows[0].cells[1]?.block.id === 'B1' &&
         rows[0].cells[2]?.block.id === 'C1' &&
         rows[1].cells[0]?.block.id === 'A2' &&
         rows[1].cells[1]?.block.id === 'B2' &&
         rows[1].cells[2]?.block.id === 'C2';
}

// Run all tests
export function runAllBlockGridTests() {
  console.log('=== Block Grid Helper Tests ===');
  
  const results = [
    testSimpleTwoColumnLayout(),
    testLayoutWithGaps(),
    testThreeColumnLayout()
  ];
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('=== Results ===');
  console.log(`${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✓ All tests passed!');
  } else {
    console.error('✗ Some tests failed');
  }
  
  return passed === total;
}

// Auto-run if in development
if (import.meta.env.DEV) {
  console.log('Block Grid Helpers loaded. Run runAllBlockGridTests() to test.');
}
