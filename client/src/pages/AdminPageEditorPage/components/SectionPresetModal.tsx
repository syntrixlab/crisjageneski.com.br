import type { ComponentProps } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faEnvelopeOpenText,
  faFileLines,
  faImage,
  faLayerGroup,
  faNewspaper,
  faTableColumns,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';
import { sectionPresets } from '@/utils/sectionPresets';
import type { PageSection } from '@/types';

interface SectionPresetModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onAddBlank: () => void;
  sections: PageSection[];
}

const presetIcons: Record<string, ComponentProps<typeof FontAwesomeIcon>['icon']> = {
  'hero-2col': faTableColumns,
  'hero-stacked': faImage,
  'features-3col': faLayerGroup,
  'cta-1col': faBullhorn,
  'content-1col': faFileLines,
  'form-2col': faEnvelopeOpenText,
  'recent-posts': faNewspaper,
  'services-4': faWandMagicSparkles
};

export function SectionPresetModal({ open, onClose, onSelectPreset, onAddBlank, sections }: SectionPresetModalProps) {
  if (!open) return null;

  // Verificar se já existe uma seção Hero
  const hasHeroSection = sections.some((s) => s.kind === 'hero');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 'min(1100px, 95vw)', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Escolha um Preset de Seção</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
            className="preset-grid"
          >
            {sectionPresets.map((preset) => {
              // Desabilitar preset Hero se já existir uma seção Hero
              const isHeroPreset = preset.id === 'hero-2col' || preset.id === 'hero-stacked';
              const isDisabled = isHeroPreset && hasHeroSection;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => !isDisabled && onSelectPreset(preset.id)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    background: isDisabled ? '#f9fafb' : 'white',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div className="preset-card-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={presetIcons[preset.id] ?? faLayerGroup} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>
                    {preset.name}
                    {isDisabled && ' (já existe)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{preset.description}</div>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onAddBlank}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#6b7280',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              + Seção em Branco (sem blocos)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
