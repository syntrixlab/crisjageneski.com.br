import { IconButton } from '@/components/AdminUI';
import type { PageSection } from '@/types';

export function SectionToolbar(_props: {
  section: PageSection;
  sectionIndex: number;
  totalSections: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSettings: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onMoveUp,
    onMoveDown,
    onSettings,
    onDuplicate,
    onRemove
  } = _props;

  const isHero = section.kind === 'hero';
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === totalSections - 1;

  return (
    <div className="section-toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <strong style={{ fontSize: '0.9rem' }}>
          {isHero ? 'Hero (Seção Fixa)' : `Seção ${sectionIndex + 1}`}
        </strong>

        {!isHero && (
          <>
            <IconButton
              icon="arrow-up"
              label="Mover para cima"
              onClick={onMoveUp}
              disabled={isFirst}
            />
            <IconButton
              icon="arrow-down"
              label="Mover para baixo"
              onClick={onMoveDown}
              disabled={isLast}
            />

            <div style={{ width: '1px', height: '20px', background: '#ddd', margin: '0 0.25rem' }} />

            <IconButton
              icon="edit"
              label="Configurar seção"
              onClick={onSettings}
            />
            <IconButton
              icon="copy"
              label="Duplicar seção"
              onClick={onDuplicate}
            />
            <IconButton
              icon="trash"
              label="Remover seção"
              onClick={onRemove}
            />
          </>
        )}
      </div>
    </div>
  );
}
