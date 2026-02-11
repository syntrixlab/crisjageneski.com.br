import type { PageBlock } from '../types';

/**
 * Calcula o span efetivo de um bloco baseado no número de colunas da seção.
 * 
 * @param block - O bloco para calcular o span
 * @param sectionColumns - Número total de colunas na seção (1, 2 ou 3)
 * @returns Span efetivo (clamped entre 1 e sectionColumns)
 */
export function calculateBlockSpan(block: PageBlock, sectionColumns: number): number {
  // Blocos full-width (hero, recent-posts, services) sempre ocupam todas as colunas
  if (block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services') {
    return sectionColumns;
  }

  // Pegar colSpan do bloco (default = 1)
  const requestedSpan = block.colSpan ?? 1;

  // Clamp: garantir que está entre 1 e sectionColumns
  return Math.max(1, Math.min(requestedSpan, sectionColumns));
}

/**
 * Gera o estilo CSS grid-column inline para um bloco.
 * Usa inline style para garantir que funciona sem depender de classes dinâmicas do Tailwind.
 * 
 * @param colIndex - Índice da coluna onde o bloco está (0-based)
 * @param span - Número de colunas que o bloco deve ocupar
 * @param isFullWidth - Se true, bloco ocupa toda a largura (1 / -1)
 * @returns Objeto de estilo React para gridColumn
 */
export function getBlockGridColumnStyle(
  colIndex: number,
  span: number,
  isFullWidth = false
): React.CSSProperties {
  if (isFullWidth) {
    return { gridColumn: '1 / -1' };
  }

  // grid-column: start / span count
  // Ex: coluna 2 com span 2 = "2 / span 2"
  return { gridColumn: `${colIndex + 1} / span ${span}` };
}

/**
 * Verifica se um bloco é do tipo full-width (deve sempre ocupar todas as colunas)
 */
export function isFullWidthBlock(block: PageBlock): boolean {
  return block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services';
}
