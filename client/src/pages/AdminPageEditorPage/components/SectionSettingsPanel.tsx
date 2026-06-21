import type { PageSection } from '@/types';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';

export function SectionSettingsPanel(_props: {
  section: PageSection;
  onChangeSectionColumns: (columns: 1 | 2 | 3) => void;
  onChangeSectionBackground: (background: 'none' | 'soft' | 'dark' | 'earthy') => void;
  onChangeSectionPadding: (padding: 'normal' | 'compact' | 'large') => void;
  onChangeSectionMaxWidth: (maxWidth: 'normal' | 'wide') => void;
  onChangeSectionHeight: (height: 'normal' | 'tall') => void;
}) {
  const {
    section,
    onChangeSectionColumns,
    onChangeSectionBackground,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight
  } = _props;

  const background = (section.settings?.background || 'none') as 'none' | 'soft' | 'dark' | 'earthy';
  const padding = (section.settings?.padding || 'normal') as 'normal' | 'compact' | 'large';
  const maxWidth = (section.settings?.maxWidth || 'normal') as 'normal' | 'wide';
  const height = (section.settings?.height || 'normal') as 'normal' | 'tall';
  const columnsCount = getSectionColumnCount(section);
  const isHero = section.kind === 'hero';

  return (
    <div className="section-settings-panel">
      <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>
        Configurações da Seção
      </h3>

      {!isHero && (
        <>
          {/* Columns */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563' }}>
              Colunas
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3].map((c) => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="columns"
                    value={c}
                    checked={columnsCount === c}
                    onChange={() => onChangeSectionColumns(c as 1 | 2 | 3)}
                    style={{ cursor: 'pointer' }}
                  />
                  {c} coluna{c > 1 ? 's' : ''}
                </label>
              ))}
            </div>
          </div>

          {/* Background */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563' }}>
              Fundo
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'none', label: 'Nenhum' },
                { value: 'soft', label: 'Suave' },
                { value: 'dark', label: 'Escuro' },
                { value: 'earthy', label: 'Terroso' }
              ].map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="background"
                    value={opt.value}
                    checked={background === opt.value}
                    onChange={() => onChangeSectionBackground(opt.value as 'none' | 'soft' | 'dark' | 'earthy')}
                    style={{ cursor: 'pointer' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Padding / Density */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563' }}>
              Espaçamento
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'compact', label: 'Compacto' },
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Generoso' }
              ].map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="padding"
                    value={opt.value}
                    checked={padding === opt.value}
                    onChange={() => onChangeSectionPadding(opt.value as 'normal' | 'compact' | 'large')}
                    style={{ cursor: 'pointer' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Height */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563' }}>
              Altura
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'tall', label: 'Alta' }
              ].map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="height"
                    value={opt.value}
                    checked={height === opt.value}
                    onChange={() => onChangeSectionHeight(opt.value as 'normal' | 'tall')}
                    style={{ cursor: 'pointer' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Max Width */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563' }}>
              Largura Máxima
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'wide', label: 'Largo' }
              ].map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="maxWidth"
                    value={opt.value}
                    checked={maxWidth === opt.value}
                    onChange={() => onChangeSectionMaxWidth(opt.value as 'normal' | 'wide')}
                    style={{ cursor: 'pointer' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
