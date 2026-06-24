import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableBlock({
  id,
  disabled,
  children
}: {
  id: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { opacity: 0.4, zIndex: 10, position: 'relative' } : {})
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}
