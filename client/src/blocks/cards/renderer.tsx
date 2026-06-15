import type { BlockRendererProps } from '../_shared/types';
import type { CardBlockData } from './schema';

export function CardsRenderer({ data }: BlockRendererProps<CardBlockData>) {
  const layout = data.layout ?? 'auto';
  const variant = data.variant ?? 'feature';
  const layoutClass = layout === 'auto' ? 'cards-layout--auto' : `cards-layout--${layout}`;
  const variantClass = `cards-variant--${variant}`;

  return (
    <div className="page-public-cards">
      {data.title && <h2 className="cards-title">{data.title}</h2>}
      {data.subtitle && <p className="cards-subtitle">{data.subtitle}</p>}
      <div className={`cards-grid ${layoutClass} ${variantClass}`.trim()}>
        {data.items.map((card) => (
          <div key={card.id} className="card-item">
            {(card.icon || card.iconImageUrl) && (
              <div className="card-icon">
                {((card.iconType === 'image' || (!card.iconType && card.iconImageUrl)) && card.iconImageUrl) ? (
                  <img className="card-icon-img" src={card.iconImageUrl} alt={card.iconAlt ?? ''} loading="lazy" />
                ) : (
                  <span className="card-icon-emoji" aria-hidden="true">{card.icon}</span>
                )}
              </div>
            )}
            <h3 className="card-title">{card.title}</h3>
            <p className="card-text">{card.text}</p>
            {card.ctaLabel && card.ctaHref && (
              <a href={card.ctaHref} className="card-cta">{card.ctaLabel} →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
