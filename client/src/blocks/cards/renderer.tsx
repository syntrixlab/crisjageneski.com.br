import type { BlockRendererProps } from '../_shared/types';
import type { CardBlockData } from './schema';

// Separa a string de ícone em emojis individuais, respeitando clusters
// (emojis compostos por ZWJ/modificadores não são quebrados ao meio).
function splitEmojis(value: string): string[] {
  const str = (value ?? '').trim();
  if (!str) return [];
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof Segmenter === 'function') {
    const seg = new Segmenter('pt', { granularity: 'grapheme' });
    return Array.from(seg.segment(str), (s) => s.segment).filter((g) => g.trim());
  }
  return Array.from(str).filter((g) => g.trim());
}

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
                  <span className="card-icon-emoji" aria-hidden="true">
                    {splitEmojis(card.icon ?? '').map((emoji, index) => (
                      <span key={index} className="card-icon-emoji-item">{emoji}</span>
                    ))}
                  </span>
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
