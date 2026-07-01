import type { CSSProperties } from 'react';
import type { BlockRendererProps } from '../_shared/types';
import type { ServicesBlockData } from './schema';

export function ServicesRenderer({ data }: BlockRendererProps<ServicesBlockData>) {
  const sectionTitle = (data.sectionTitle ?? 'Serviços').toString().trim() || 'Serviços';
  const buttonLabel = (data.buttonLabel ?? 'Saiba mais').toString().trim() || 'Saiba mais';
  const items = Array.isArray(data.items) ? data.items : [];
  const defaultIconSrc = data.iconImageUrl || '/assets/brand/spiral.png';
  const defaultIconAlt = data.iconAlt || '';

  // Cor do texto (título/descrição dos itens) e do botão: 'default' = cores do tema; 'custom' = cor escolhida.
  const sectionStyle: CSSProperties = {
    ...(data.textColorMode === 'custom' && data.textColor ? { '--services-text-color': data.textColor } : {}),
    ...(data.buttonColorMode === 'custom' && data.buttonColor ? { '--services-button-color': data.buttonColor } : {})
  } as CSSProperties;

  return (
    <div className="services-section" style={sectionStyle}>
      <div className="services-header">
        <h2>{sectionTitle}</h2>
        <span className="services-accent" aria-hidden="true" />
      </div>
      <div className="services-grid">
        {items.map((item) => {
          const iconSrc = item.iconImageUrl || defaultIconSrc;
          const iconAlt = item.iconAlt || defaultIconAlt;
          return (
            <div key={item.id} className="service-card">
              <div className="service-icon" aria-hidden="true">
                <img src={iconSrc} alt={iconAlt} />
              </div>
              <h3 className="service-card__title">{item.title}</h3>
              {item.description && <p className="service-description">{item.description}</p>}
              <a className="btn btn-outline services-cta" href={item.href || '#'}>{buttonLabel}</a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
