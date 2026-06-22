import type { PageSection } from '@/types';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import { SegmentedControl } from '@/components/SegmentedControl';

type Columns = 1 | 2 | 3;
type Background = 'none' | 'soft' | 'dark' | 'earthy';
type Padding = 'normal' | 'compact' | 'large';
type MaxWidth = 'normal' | 'wide';
type Height = 'normal' | 'tall';

export function SectionSettingsPanel(_props: {
  section: PageSection;
  onChangeSectionColumns: (columns: Columns) => void;
  onChangeSectionBackground: (background: Background) => void;
  onChangeSectionPadding: (padding: Padding) => void;
  onChangeSectionMaxWidth: (maxWidth: MaxWidth) => void;
  onChangeSectionHeight: (height: Height) => void;
}) {
  const {
    section,
    onChangeSectionColumns,
    onChangeSectionBackground,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight
  } = _props;

  const background = (section.settings?.background || 'none') as Background;
  const padding = (section.settings?.padding || 'normal') as Padding;
  const maxWidth = (section.settings?.maxWidth || 'normal') as MaxWidth;
  const height = (section.settings?.height || 'normal') as Height;
  const columnsCount = getSectionColumnCount(section);
  const isHero = section.kind === 'hero';

  if (isHero) {
    return (
      <div className="section-settings-panel">
        <h3 className="inspector-section-title">Configurações da Seção</h3>
        <p className="inspector-hint">
          A seção Hero é fixa e não pode ser reconfigurada por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="section-settings-panel">
      <h3 className="inspector-section-title">Configurações da Seção</h3>

      <div className="inspector-field">
        <label className="inspector-label">Colunas</label>
        <SegmentedControl<string>
          block
          ariaLabel="Colunas"
          value={String(columnsCount)}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' }
          ]}
          onChange={(v) => onChangeSectionColumns(Number(v) as Columns)}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Fundo</label>
        <SegmentedControl<Background>
          block
          ariaLabel="Fundo"
          value={background}
          options={[
            { value: 'none', label: 'Nenhum' },
            { value: 'soft', label: 'Suave' },
            { value: 'dark', label: 'Escuro' },
            { value: 'earthy', label: 'Terroso' }
          ]}
          onChange={onChangeSectionBackground}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Espaçamento</label>
        <SegmentedControl<Padding>
          block
          ariaLabel="Espaçamento"
          value={padding}
          options={[
            { value: 'compact', label: 'Compacto' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Generoso' }
          ]}
          onChange={onChangeSectionPadding}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Altura</label>
        <SegmentedControl<Height>
          block
          ariaLabel="Altura"
          value={height}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'tall', label: 'Alta' }
          ]}
          onChange={onChangeSectionHeight}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Largura máxima</label>
        <SegmentedControl<MaxWidth>
          block
          ariaLabel="Largura máxima"
          value={maxWidth}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Largo' }
          ]}
          onChange={onChangeSectionMaxWidth}
        />
      </div>
    </div>
  );
}
