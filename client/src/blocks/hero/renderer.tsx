import type { CSSProperties } from 'react';
import { getBlockImageCropStylesNoTransform } from '@/utils/imageCrop';
import type { ImageBlockData, HeroBlockDataV2, HeroImageHeight, PageBlock } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { HeroBlockData } from './schema';

const HERO_IMAGE_HEIGHTS: Record<Exclude<HeroImageHeight, number>, string> = {
  sm: 'clamp(220px, 28vw, 320px)',
  md: 'clamp(280px, 34vw, 420px)',
  lg: 'clamp(340px, 40vw, 520px)',
  xl: 'clamp(420px, 48vw, 640px)'
};

function mapHeroHeightPctToPreset(heightPct?: number | null): keyof typeof HERO_IMAGE_HEIGHTS | null {
  if (typeof heightPct !== 'number' || Number.isNaN(heightPct)) return null;
  if (heightPct <= 45) return 'sm';
  if (heightPct <= 65) return 'md';
  if (heightPct <= 85) return 'lg';
  return 'xl';
}

function resolveHeroImageHeight(imageHeight: HeroImageHeight | null | undefined, heightPct?: number | null): string {
  if (typeof imageHeight === 'number' && Number.isFinite(imageHeight)) {
    return `${Math.max(120, Math.min(Math.round(imageHeight), 2000))}px`;
  }
  if (imageHeight && imageHeight in HERO_IMAGE_HEIGHTS) {
    return HERO_IMAGE_HEIGHTS[imageHeight as keyof typeof HERO_IMAGE_HEIGHTS];
  }
  const mapped = mapHeroHeightPctToPreset(heightPct ?? null) ?? 'lg';
  return HERO_IMAGE_HEIGHTS[mapped];
}

export function HeroRenderer({ data, pageSlug: _pageSlug, enableFormSubmit: _enableFormSubmit, renderChild }: BlockRendererProps<HeroBlockData>) {
  // Detectar se é Hero V2 (bloco composto)
  if ('version' in data && data.version === 2) {
    const heroV2 = data as HeroBlockDataV2;
    const layoutVariant = heroV2.layoutVariant ?? 'split';
    const firstImage = (heroV2.right ?? []).find((b) => b.type === 'image') as PageBlock | undefined;
    const heightPct = firstImage?.type === 'image' ? (firstImage.data as ImageBlockData).heightPct : undefined;
    const heroImageHeight = resolveHeroImageHeight(heroV2.imageHeight, heightPct ?? null);

    const renderHeroImage = (childBlock: PageBlock, variant: 'split' | 'stacked') => {
      if (childBlock.type !== 'image') {
        // span necessário para o key do React; display:contents evita quebra de layout — substituição de PageBlockView sem importar registry
        return (
          <span key={childBlock.id} style={{ display: 'contents' }}>
            {renderChild?.(childBlock)}
          </span>
        );
      }

      const imgData = childBlock.data as ImageBlockData;
      // Hero: usar versão SEM transform - apenas object-fit/position
      const cropStyles = getBlockImageCropStylesNoTransform(
        imgData.naturalWidth ?? undefined,
        imgData.naturalHeight ?? undefined,
        imgData.cropX,
        imgData.cropY,
        imgData.cropWidth,
        imgData.cropHeight
      );

      return (
        <div
          key={childBlock.id}
          className={`hero-media ${variant === 'stacked' ? 'hero-media--stacked' : ''}`.trim()}
          style={{ ['--hero-media-height' as any]: heroImageHeight } as CSSProperties}
        >
          {imgData.src ? (
            <img
              src={imgData.src}
              alt={imgData.alt || ''}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                ...cropStyles
              }}
            />
          ) : (
            <div className="hero-media-placeholder">Sem imagem</div>
          )}
        </div>
      );
    };

    if (layoutVariant === 'stacked') {
      const mediaBlock = (heroV2.right ?? []).find((child) => child.type === 'image');
      return (
        <div className="hero hero--v2 hero-card hero--stacked">
          {mediaBlock ? renderHeroImage(mediaBlock, 'stacked') : (
            <div className="hero-media hero-media--stacked" style={{ ['--hero-media-height' as any]: heroImageHeight } as CSSProperties}>
              <div className="hero-media-placeholder">Sem imagem</div>
            </div>
          )}
          <div className="hero-body hero-body--stacked">
            <div className="hero-content hero-content--stacked">
              {/* span necessário para o key do React; display:contents evita quebra de layout — substituição de PageBlockView sem importar registry */}
              {(heroV2.left ?? []).map((childBlock) => (
                <span key={childBlock.id} style={{ display: 'contents' }}>
                  {renderChild?.(childBlock)}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hero hero--v2 hero-card hero--split">
        <div className="hero-body hero-body--split">
          <div className="hero-content hero-content--split">
            {/* span necessário para o key do React; display:contents evita quebra de layout — substituição de PageBlockView sem importar registry */}
            {(heroV2.left ?? []).map((childBlock) => (
              <span key={childBlock.id} style={{ display: 'contents' }}>
                {renderChild?.(childBlock)}
              </span>
            ))}
          </div>
          <div className="hero-media-column">
            {(heroV2.right ?? []).map((childBlock) => renderHeroImage(childBlock, 'split'))}
          </div>
        </div>
      </div>
    );
  }

  // Hero V1 (legado)
  const dataV1 = data as Record<string, unknown>;
  const heading = typeof dataV1.heading === 'string' ? dataV1.heading : 'Psicologia para vidas com mais sentido';
  const subheading =
    typeof dataV1.subheading === 'string'
      ? dataV1.subheading
      : 'Caminhadas terapêuticas com escuta junguiana, argilaria e expressão criativa, para acolher sua história.';
  const ctaLabel = typeof dataV1.ctaLabel === 'string' ? dataV1.ctaLabel : 'Agendar sessão';
  const ctaHref = typeof dataV1.ctaHref === 'string' ? dataV1.ctaHref : '/contato';
  const secondaryCta = typeof dataV1.secondaryCta === 'string' ? dataV1.secondaryCta : 'Conhecer a abordagem';
  const secondaryHref = typeof dataV1.secondaryHref === 'string' ? dataV1.secondaryHref : '/sobre';
  const badges =
    Array.isArray(dataV1.badges) && dataV1.badges.every((item) => typeof item === 'string')
      ? (dataV1.badges as string[])
      : ['Junguiana', 'Argilaria', 'Expressão criativa'];

  const rawMode = (dataV1.mediaMode as string) || 'four_cards';
  const mediaMode = rawMode === 'single_card' ? 'cards_only' : ['single_image', 'cards_only', 'four_cards'].includes(rawMode) ? rawMode : 'four_cards';

  const fallbackQuote =
    'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.';

  const renderSingleImage = () => {
    // V1 hero: sem schema tipado, dado bruto de páginas legadas
    const image = (dataV1.singleImage as any) || {};
    const url = typeof image.url === 'string' ? image.url : '';
    const alt = typeof image.alt === 'string' ? image.alt : '';
    if (!url) {
      return <div className="hero-image-placeholder">Sem imagem</div>;
    }
    return (
      <div className="hero-single-image-frame">
        <img className="hero-single-image" src={url} alt={alt} />
      </div>
    );
  };

  const renderFourCards = () => {
    // V1 hero: sem schema tipado, dado bruto de páginas legadas
    const fc = (dataV1.fourCards as any) || {};
    const medium = fc.medium || {
      title: fallbackQuote,
      text: 'Texto'
    };
    const small = Array.from({ length: 3 }).map((_, idx) => {
      const card = fc.small?.[idx] || {};
      const defaults = [
        { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.' },
        { title: 'Relações saudáveis', text: 'Comunicação e limites claros.' },
        { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.' }
      ][idx];
      return {
        title: card.title ?? defaults.title,
        text: card.text ?? defaults.text,
        icon: card.icon,
        url: card.url,
        alt: card.alt,
        imageId: card.imageId
      };
    });

    return (
      <div className="hero-cards-grid">
        <div className="hero-card hero-card-medium">
          {medium.icon && <div className="hero-card-icon">{medium.icon}</div>}
          {medium.url && <img className="hero-card-image" src={medium.url} alt={medium.alt ?? ''} />}
          <p>{medium.title}</p>
          <strong>{medium.text}</strong>
        </div>
        <div className="hero-small-cards">
          {small.map((card, idx) => (
            <div key={idx} className="hero-card hero-card-small">
              {card.icon && <div className="hero-card-icon">{card.icon}</div>}
              {card.url && <img className="hero-card-image" src={card.url} alt={card.alt ?? ''} />}
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCardsOnly = () => {
    // V1 hero: sem schema tipado, dado bruto de páginas legadas
    const fc = (dataV1.fourCards as any) || {};
    const medium = fc.medium || { title: fallbackQuote, text: 'Texto' };
    const small = Array.from({ length: 3 }).map((_, idx) => {
      const card = fc.small?.[idx] || {};
      const defaults = [
        { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.' },
        { title: 'Relações saudáveis', text: 'Comunicação e limites claros.' },
        { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.' }
      ][idx];
      return {
        title: card.title ?? defaults.title,
        text: card.text ?? defaults.text,
        icon: card.icon
      };
    });

    return (
      <div className="heroCardsOnly">
        <div className="heroMediumRow">
          <div className="hero-card hero-card-medium">
            {medium.icon && <div className="hero-card-icon">{medium.icon}</div>}
            <p>{medium.title}</p>
            <strong>{medium.text}</strong>
          </div>
        </div>
        <div className="heroSmallRow">
          <div className="heroSmallGrid">
            {small.map((card, idx) => (
              <div key={idx} className="hero-card hero-card-small">
                {card.icon && <div className="hero-card-icon">{card.icon}</div>}
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hero">
      <div className="hero-text hero-overlay-bg">
        <h1
          className="organic-accent"
          style={{ fontSize: 'clamp(2.3rem, 4vw, 3.3rem)', margin: 0, color: 'var(--color-deep)' }}
        >
          {heading}
        </h1>
        {subheading && (
          <p style={{ maxWidth: '680px', margin: 0, color: 'var(--color-forest)', fontSize: '1.05rem' }}>{subheading}</p>
        )}
        <div className="hero-badges">
          {badges.map((badge) => (
            <span key={badge} className="badge">
              {badge}
            </span>
          ))}
        </div>
        <div className="flex">
          <a href={ctaHref} target="_blank" rel="noreferrer" className="btn btn-primary">
            {ctaLabel}
          </a>
          <a href={secondaryHref} className="btn btn-outline">
            {secondaryCta}
          </a>
        </div>
        <div className="muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Atendimento online e presencial</span>
          <span>Sigilo e confidencialidade garantidos</span>
        </div>
      </div>
      <div className={`hero-visual hero-visual--${mediaMode}`}>
        {mediaMode === 'single_image' && renderSingleImage()}
        {mediaMode === 'cards_only' && renderCardsOnly()}
        {mediaMode === 'four_cards' && renderFourCards()}
      </div>
    </div>
  );
}
