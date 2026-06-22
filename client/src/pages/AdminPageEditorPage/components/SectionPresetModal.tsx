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
      <div className="modal-card preset-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Escolha um Preset de Seção</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="preset-grid">
            {sectionPresets.map((preset) => {
              // Desabilitar preset Hero se já existir uma seção Hero
              const isHeroPreset = preset.id === 'hero-2col' || preset.id === 'hero-stacked';
              const isDisabled = isHeroPreset && hasHeroSection;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-card"
                  onClick={() => !isDisabled && onSelectPreset(preset.id)}
                  disabled={isDisabled}
                >
                  <div className="preset-card-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={presetIcons[preset.id] ?? faLayerGroup} />
                  </div>
                  <div className="preset-card-title">
                    {preset.name}
                    {isDisabled && ' (já existe)'}
                  </div>
                  <div className="preset-card-desc">{preset.description}</div>
                </button>
              );
            })}
          </div>

          <div className="preset-divider">
            <button type="button" className="preset-blank-btn" onClick={onAddBlank}>
              + Seção em Branco (sem blocos)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
