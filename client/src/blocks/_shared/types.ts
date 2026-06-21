import type React from 'react';
import type { PageBlock } from '@/types';

export interface BlockFormProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export interface BlockRendererProps<T = unknown> {
  data: T;
  blockId?: string;
  pageSlug?: string;
  enableFormSubmit?: boolean;
  // Render prop para renderização recursiva do hero (evita dependência circular)
  renderChild?: (block: PageBlock) => React.ReactNode;
}

export interface BlockConfig<T = unknown> {
  label: string;
  defaultData: T;
  renderer: React.ComponentType<BlockRendererProps<T>>;
  form: React.ComponentType<BlockFormProps<T>>;
  icon?: string; // Emoji ou símbolo para exibição no modal
}
