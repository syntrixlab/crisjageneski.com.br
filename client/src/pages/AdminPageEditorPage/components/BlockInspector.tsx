import React from 'react';
import { blockRegistry } from '@/blocks/registry';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { BlockType, PageBlock } from '@/types';

// Blocos que sempre ocupam a largura total da seção — sem controle de colunas.
const FULL_WIDTH_TYPES: ReadonlySet<string> = new Set(['hero', 'recent-posts', 'services', 'contact-info']);

export function BlockInspector(_props: {
  block: PageBlock;
  columnCount: number;
  onChangeData: (data: PageBlock['data']) => void;
  onChangeColSpan: (colSpan: number) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { block, columnCount, onChangeData, onChangeColSpan, onUploadingChange } = _props;
  const config = blockRegistry[block.type as BlockType];

  if (!config) {
    return (
      <div className="block-inspector">
        <p className="inspector-hint">Tipo de bloco desconhecido: {block.type}</p>
      </div>
    );
  }

  const Form = config.form as React.ComponentType<{
    value: unknown;
    onChange: (value: unknown) => void;
    onUploadingChange?: (uploading: boolean) => void;
  }>;

  const showColSpan = columnCount > 1 && !FULL_WIDTH_TYPES.has(block.type);
  const currentSpan = Math.max(1, Math.min(block.colSpan ?? 1, columnCount));

  return (
    <div className="block-inspector">
      <h3 className="inspector-section-title">{config.label}</h3>

      {showColSpan && (
        <div className="inspector-field">
          <label className="inspector-label">Largura (colunas)</label>
          <SegmentedControl<string>
            block
            ariaLabel="Largura em colunas"
            value={String(currentSpan)}
            options={Array.from({ length: columnCount }).map((_, idx) => ({
              value: String(idx + 1),
              label: `${idx + 1} col${idx + 1 > 1 ? 's' : ''}`
            }))}
            onChange={(v) => onChangeColSpan(Number(v))}
          />
        </div>
      )}

      <div className="inspector-field">
        <Form
          value={block.data}
          onChange={(data) => onChangeData(data as PageBlock['data'])}
          onUploadingChange={onUploadingChange}
        />
      </div>
    </div>
  );
}
