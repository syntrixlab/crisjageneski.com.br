import { useState, type FormEvent, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PageBlock, PageLayout, PageLayoutV2, PageSection, FormBlockData, Article, SiteSettings, SocialLink, ImageBlockData, HeroImageHeight, HeroBlockDataV2, ServicesBlockData, CtaBlockData, MediaTextBlockData } from '../types';
import type { PaginatedResponse } from '../api/queries';
import { RichText } from './RichText';
import { ArticleCard } from './ArticleCard';
import { ensureLayoutV2 } from '../utils/pageLayoutHelpers';
import { submitForm, fetchArticles, fetchSiteSettings } from '../api/queries';
import { getBlockImageCropStyles, getBlockImageCropStylesNoTransform } from '../utils/imageCrop';
import { calculateBlockSpan } from '../utils/columnSpan';
import { organizeSectionBlocksIntoRows } from '../utils/blockGridHelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type BlockPosition = {
  block: PageBlock;
  colStart: number; // 1-indexed
  colSpan: number;
  rowStart: number; // 1-indexed
  rowSpan: number;
};

/**
 * Calcula rowSpan inteligente para blocos.
 * Se um bloco ocupa colunas X..Y e não há blocos nas rows abaixo que interseccionem esse intervalo,
 * o bloco deve spannar essas rows (caso do formulário no Contato).
 */
function calculateRowSpan(
  rowIndex: number,
  colStart: number,
  colEnd: number,
  allRows: ReturnType<typeof organizeSectionBlocksIntoRows>
): number {
  let span = 1;
  
  // Percorrer rows abaixo da atual
  for (let r = rowIndex + 1; r < allRows.length; r++) {
    const row = allRows[r];
    
    // Verificar se algum bloco dessa row intersecciona o intervalo [colStart, colEnd]
    const hasIntersection = row.cells.some(cell => {
      if (!cell) return false;
      
      const cellColStart = cell.colIndex + 1; // cells usam colIndex 0-indexed
      const cellColSpan = (cell.block as any).colSpan ?? 1;
      const cellColEnd = cellColStart + cellColSpan - 1;
      
      // Checa interseção
      return !(cellColEnd < colStart || cellColStart > colEnd);
    });
    
    if (hasIntersection) {
      // Encontrou bloco que intersecciona, parar de expandir
      break;
    }
    
    // Nenhuma interseção, pode spannar mais uma row
    span++;
  }
  
  return span;
}
import { 
  faCheck, 
  faGlobe, 
  faEnvelope, 
  faLink 
} from '@fortawesome/free-solid-svg-icons';
import { 
  faInstagram, 
  faFacebook, 
  faLinkedin, 
  faYoutube, 
  faTiktok, 
  faXTwitter,
  faWhatsapp 
} from '@fortawesome/free-brands-svg-icons';

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

/**
 * Filtra placeholders e blocos não renderizáveis.
 * Placeholders do editor não devem aparecer no front público.
 */
function isRenderableBlock(block: PageBlock): boolean {
  if (!block) return false;
  if (block.visible === false) return false;
  
  // Filtrar placeholders específicos (ajustar conforme necessário)
  const blockData = block.data as any;
  if (blockData?.kind === 'placeholder') return false;
  if (blockData?.isPlaceholder) return false;
  if (block.id?.includes('empty-row')) return false;
  
  return true;
}

type RendererProps = {
  layout?: PageLayout;
  className?: string;
  pageSlug?: string;
};

export function PageRenderer({ layout, className, pageSlug }: RendererProps) {
  const normalized = ensureLayoutV2(layout);

  if (!normalized.sections || normalized.sections.length === 0) {
    return <div className={`page-public-content ${className ?? ''}`.trim()}>Nenhum conteúdo disponível.</div>;
  }

  return (
    <div className={`page-public-content ${className ?? ''}`.trim()}>
      {normalized.sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} sectionIndex={index} pageSlug={pageSlug} />
      ))}
    </div>
  );
}

// ================= CORE RENDERER (Shared between public and admin preview) =================
type PageRendererCoreProps = {
  layout: PageLayoutV2;
  className?: string;
  enableFormSubmit?: boolean; // false no admin preview para evitar submissões acidentais
  pageSlug?: string;
};

export function PageRendererCore({ layout, className = '', enableFormSubmit = true, pageSlug }: PageRendererCoreProps) {
  if (!layout.sections || layout.sections.length === 0) {
    return <div className={`page-public-content ${className}`.trim()}>Nenhum conteúdo disponível.</div>;
  }

  return (
    <div className={`page-public-content ${className}`.trim()}>
      {layout.sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} sectionIndex={index} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
      ))}
    </div>
  );
}

function SectionRenderer({ section, sectionIndex, enableFormSubmit = true, pageSlug }: { section: PageSection; sectionIndex: number; enableFormSubmit?: boolean; pageSlug?: string }) {
  const settings = section.settings ?? {};
  const background = (settings.backgroundStyle as string) || (settings.background as string) || 'none';
  const backgroundClass =
    background === 'soft'
      ? 'section-bg-soft'
      : background === 'dark'
        ? 'section-bg-dark'
        : background === 'earthy'
          ? 'section-bg-earthy'
          : 'section-bg-none';
  
  const density = (settings.density as string) || (settings.padding as string) || 'normal';
  const paddingClass = `section-padding-${density}`;
  
  const width = (settings.width as string) || (settings.maxWidth as string) || 'normal';
  const maxWidthClass = `section-maxwidth-${width}`;

  const height = (settings.height as string) || 'normal';
  const heightClass = height === 'tall' ? 'section-height-tall' : '';

  const hasHero = section.cols.some((col) => col.blocks.some((b) => b.type === 'hero'));
  const containerClass = hasHero ? 'container container--flush' : 'container';
  const columnCount = settings.columnsLayout ?? section.columnsLayout ?? section.columns ?? 2;
  const effectiveColumns = hasHero ? 1 : columnCount;

  // Determinar se deve aplicar section-container visual (soft ou dark, mas não hero)
  const shouldApplyContainer = (background === 'soft' || background === 'dark' || background === 'earthy') && !hasHero;
  const sectionContainerClass = shouldApplyContainer ? 'section-container' : '';

  // Organizar blocos em linhas usando blockGridHelpers (preserva ordem/semântica do builder)
  const rows = organizeSectionBlocksIntoRows(section);
  
  // Se não há rows, renderizar seção vazia
  if (rows.length === 0) {
    return null;
  }
  
  // Calcular posições de grid (rowStart, rowSpan, colStart, colSpan) para cada bloco
  const blockPositions: BlockPosition[] = [];
  
  rows.forEach((row, rowIdx) => {
    row.cells.forEach(cell => {
      if (!cell) return; // Célula vazia
      
      const { block, colIndex } = cell;
      
      // colStart: 1-indexed (grid CSS)
      const colStart = colIndex + 1;
      
      // colSpan: baseado no bloco, clamped
      const colSpan = calculateBlockSpan(block, effectiveColumns);
      
      // rowStart: 1-indexed (grid CSS)
      const rowStart = rowIdx + 1;
      
      // rowSpan: calculado inteligentemente
      const colEnd = colStart + colSpan - 1;
      const rowSpan = calculateRowSpan(rowIdx, colStart, colEnd, rows);
      
      blockPositions.push({
        block,
        colStart,
        colSpan,
        rowStart,
        rowSpan
      });
    });
  });

  return (
    <section className={`page-public-section ${backgroundClass} ${paddingClass} ${maxWidthClass} ${heightClass}`.trim()} data-section-index={sectionIndex}>
      <div className={containerClass}>
        <div
          className={`page-public-grid ${sectionContainerClass} cols-${effectiveColumns}`.trim()}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
            gap: 'var(--space-6)',
            alignItems: 'start',
            gridAutoRows: 'auto'
          }}
        >
          {blockPositions.map((pos) => {
            if (!isRenderableBlock(pos.block)) return null;
            
            return (
              <div
                key={pos.block.id}
                className="page-public-block"
                style={{
                  gridColumn: `${pos.colStart} / span ${pos.colSpan}`,
                  gridRow: `${pos.rowStart} / span ${pos.rowSpan}`
                }}
              >
                <PageBlockView block={pos.block} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PageBlockView({ block, enableFormSubmit = true, pageSlug }: { block: PageBlock; enableFormSubmit?: boolean; pageSlug?: string }) {
  if (!block) return null;

  switch (block.type) {
    case 'text': {
      const widthClass = block.data.width === 'wide' ? 'page-text--wide' : '';
      const backgroundClass = block.data.background === 'soft' ? 'page-text--soft' : '';
      return (
        <div className={`page-public-text ${widthClass} ${backgroundClass}`.trim()}>
          <RichText html={block.data.contentHtml || ''} />
        </div>
      );
    }
    case 'image': {
      const size = block.data.size ?? 100;
      const align = block.data.align ?? 'center';
      const hasCrop = ['cropX', 'cropY', 'cropWidth', 'cropHeight'].every(
        (key) => (block.data as any)[key] !== null && (block.data as any)[key] !== undefined
      );

      const cropStyles = hasCrop
        ? getBlockImageCropStyles(
            block.data.naturalWidth ?? undefined,
            block.data.naturalHeight ?? undefined,
            block.data.cropX,
            block.data.cropY,
            block.data.cropWidth,
            block.data.cropHeight
          )
        : {};

      const cropRatioClass =
        block.data.cropRatio === '16:9'
          ? 'page-public-image--crop-16-9'
          : block.data.cropRatio === '9:16'
            ? 'page-public-image--crop-9-16'
            : block.data.cropRatio === '1:1'
              ? 'page-public-image--crop-1-1'
              : block.data.cropRatio === '4:3'
                ? 'page-public-image--crop-4-3'
                : '';

      const cropClasses = hasCrop
        ? ['page-public-image--cropped', cropRatioClass].filter(Boolean).join(' ')
        : '';

      const figureClass = `page-public-image rte-image--size-${size} rte-image--align-${align} ${cropClasses}`.trim();

      return (
        <figure className={figureClass}>
          <img 
            src={block.data.src} 
            alt={block.data.alt ?? ''} 
            loading="lazy"
            style={cropStyles}
          />
        </figure>
      );
    }
    case 'button': {
      const variant = block.data.variant ?? 'primary';
      const classes =
        variant === 'secondary' ? 'btn btn-outline' : variant === 'ghost' ? 'btn btn-ghost' : 'btn btn-primary';
      return (
        <div className="page-public-button-wrapper">
          <a
            className={`page-public-button ${classes}`.trim()}
            href={block.data.href || '#'}
            target={block.data.newTab ? '_blank' : undefined}
            rel={block.data.newTab ? 'noreferrer' : undefined}
          >
            {block.data.icon && <span className="page-button-icon">{block.data.icon}</span>}
            <span>{block.data.label}</span>
          </a>
        </div>
      );
    }
    case 'cta': {
      const data = block.data as CtaBlockData;
      const title = data.title ?? 'Vamos conversar?';
      const text = data.text ?? 'Agende uma conversa inicial para entender o melhor plano.';
      const ctaLabel = data.ctaLabel ?? 'Agendar';
      const ctaHref = data.ctaHref ?? '/contato';
      const imageUrl = data.imageUrl ?? null;
      const imageAlt = data.imageAlt ?? '';
      const openInNewTab = data.ctaLinkMode === 'manual' && /^https?:\/\//i.test(ctaHref);

      return (
        <div className={`cta-block ${imageUrl ? 'cta-block--with-media' : 'cta-block--no-media'}`.trim()}>
          <div className="cta-content">
            <div className="section-title" style={{ marginBottom: '1rem' }}>
              <h2>{title}</h2>
              {text && <p>{text}</p>}
            </div>
            <div className="cta-actions">
              <a className="btn btn-primary" href={ctaHref} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined}>
                {ctaLabel}
              </a>
            </div>
          </div>
          {imageUrl && (
            <div className="cta-media" aria-hidden="true">
              <img src={imageUrl} alt={imageAlt} loading="lazy" />
            </div>
          )}
        </div>
      );
    }
    case 'media-text': {
      const data = block.data as MediaTextBlockData;
      const side = data.imageSide === 'right' ? 'right' : 'left';
      const rawWidth = (data as any).imageWidth ?? (data as any).imageWidthPct ?? 50;
      const rawCustomWidthPct = Number((data as any).customImageWidthPct);
      const rawCustomWidth = Number((data as any).customImageWidthPx);
      const widthPreset: 25 | 50 | 75 | 100 = [25, 50, 75, 100].includes(Number(rawWidth) as any)
        ? (Number(rawWidth) as 25 | 50 | 75 | 100)
        : 50;
      const customWidthPct =
        Number.isFinite(rawCustomWidthPct) && rawCustomWidthPct > 0 ? Math.max(1, Math.min(Math.round(rawCustomWidthPct), 100)) : null;
      const customWidthPx =
        Number.isFinite(rawCustomWidth) && rawCustomWidth > 0 ? Math.max(120, Math.min(Math.round(rawCustomWidth), 2000)) : null;
      const resolvedImageWidth = customWidthPct ? `${customWidthPct}%` : customWidthPx ? `${customWidthPx}px` : `${widthPreset}%`;

      return (
        <div
          className={`page-media-text page-media-text--${side}`.trim()}
          style={{
            ['--media-text-image-width' as any]: resolvedImageWidth
          }}
        >
          <figure className="page-media-text-image">
            {data.imageUrl ? (
              <img src={data.imageUrl} alt={data.imageAlt ?? ''} loading="lazy" />
            ) : (
              <div className="page-media-text-placeholder">Sem imagem</div>
            )}
          </figure>
          <div className="page-media-text-content">
            <RichText html={data.contentHtml || ''} />
          </div>
        </div>
      );
    }
    case 'cards': {
      const layout = block.data.layout ?? 'auto';
      const variant = block.data.variant ?? 'feature';
      const layoutClass = layout === 'auto' ? 'cards-layout--auto' : `cards-layout--${layout}`;
      const variantClass = `cards-variant--${variant}`;

      return (
        <div className="page-public-cards">
          {block.data.title && <h2 className="cards-title">{block.data.title}</h2>}
          {block.data.subtitle && <p className="cards-subtitle">{block.data.subtitle}</p>}
          <div className={`cards-grid ${layoutClass} ${variantClass}`.trim()}>
            {block.data.items.map((card) => (
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
                  <a href={card.ctaHref} className="card-cta">
                    {card.ctaLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'form': {
      return <FormRenderer block={block} enableSubmit={enableFormSubmit} />;
    }
    case 'hero': {
      const data = block.data;
      
      // Detectar se ?? Hero V2 (bloco composto)
      if ('version' in data && data.version === 2) {
        const heroV2 = data as HeroBlockDataV2;
        const layoutVariant = heroV2.layoutVariant ?? 'split';
        const firstImage = (heroV2.right ?? []).find((b) => b.type === 'image') as PageBlock | undefined;
        const heightPct = firstImage?.type === 'image' ? (firstImage.data as ImageBlockData).heightPct : undefined;
        const heroImageHeight = resolveHeroImageHeight(heroV2.imageHeight, heightPct ?? null);

        const renderHeroImage = (childBlock: PageBlock, variant: 'split' | 'stacked') => {
          if (childBlock.type !== 'image') {
            return <PageBlockView key={childBlock.id} block={childBlock} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />;
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
              <div className="hero-body hero-body--stacked hero-overlay-bg">
                <div className="hero-content hero-content--stacked">
                  {(heroV2.left ?? []).map((childBlock) => (
                    <PageBlockView key={childBlock.id} block={childBlock} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
                  ))}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="hero hero--v2 hero-card hero--split">
            <div className="hero-body hero-body--split">
              <div className="hero-content hero-content--split hero-overlay-bg">
                {(heroV2.left ?? []).map((childBlock) => (
                  <PageBlockView key={childBlock.id} block={childBlock} enableFormSubmit={enableFormSubmit} pageSlug={pageSlug} />
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
        const fc = (dataV1.fourCards as any) || {};
        const medium = fc.medium || {
          title: fallbackQuote,
          text: 'Cristiane Jageneski'
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
        const fc = (dataV1.fourCards as any) || {};
        const medium = fc.medium || { title: fallbackQuote, text: 'Cristiane Jageneski' };
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
    case 'pills': {
      const data = block.data as any;
      const rawPills = data.pills ?? data.items ?? [];
      const sizeClass = data.size ? `pills--${data.size}` : '';
      const variantClass = data.variant ? `pills--${data.variant}` : '';
      
      return (
        <div className={`pills-row ${sizeClass} ${variantClass}`.trim()}>
          {rawPills.map((pill: string | import('../types').PillItem, idx: number) => {
            // Normalize pill data
            const pillData = typeof pill === 'string' 
              ? { text: pill, href: null, linkMode: null, articleSlug: null }
              : pill;
            
            // Determine final href
            const href = pillData.linkMode === 'article' && pillData.articleSlug
              ? `/blog/${pillData.articleSlug}`
              : pillData.href;
            
            // Render as link if href exists, otherwise as span
            if (href) {
              return (
                <a key={idx} href={href} className="pill pill--link">
                  {pillData.text}
                </a>
              );
            }
            
            return (
              <span key={idx} className="pill">
                {pillData.text}
              </span>
            );
          })}
        </div>
      );
    }
    case 'span': {
      if (block.data.kind === 'accent-bar') {
        return <span className="hero-accent-bar" aria-hidden="true" />;
      }
      if (block.data.kind === 'muted-text') {
        return <span className="muted">{block.data.text || ''}</span>;
      }
      return null;
    }
    case 'buttonGroup': {
      const buttons = block.data.buttons ?? [];
      const align = block.data.align ?? 'start';
      const stackOnMobile = block.data.stackOnMobile ?? true;
      const alignClass = align === 'center' ? 'hero-actions--center' : 'hero-actions--start';
      const stackClass = stackOnMobile ? 'hero-actions--stack' : '';
      
      return (
        <div className={`hero-actions ${alignClass} ${stackClass}`.trim()}>
          {buttons.map((btn, idx) => {
            const variant = btn.variant ?? 'primary';
            const classes =
              variant === 'secondary' ? 'btn btn-outline' : 'btn btn-primary';
            return (
              <a
                key={idx}
                className={classes}
                href={btn.href || '#'}
                target={btn.linkMode === 'page' ? undefined : '_blank'}
                rel={btn.linkMode === 'page' ? undefined : 'noreferrer'}
              >
                {btn.label}
              </a>
            );
          })}
        </div>
      );
    }
    case 'recent-posts': {
      return <RecentPostsRenderer block={block} />;
    }
    case 'social-links': {
      return <SocialLinksRenderer block={block} />;
    }
    case 'whatsapp-cta': {
      return <WhatsAppCtaRenderer block={block} />;
    }
    case 'contact-info': {
      return <ContactInfoRenderer block={block} />;
    }
    case 'services': {
      return <ServicesRenderer block={block} />;
    }
    default:
      return null;
  }
}

// ================= CONTACT INFO RENDERER =================
function ContactInfoRenderer({ block }: { block: PageBlock & { type: 'contact-info' } }) {
  const data = block.data;
  
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (!settings) return null;

  // Configurações do WhatsApp
  const whatsappEnabled = settings.whatsappEnabled ?? false;
  const whatsappLink = settings.whatsappLink || '';
  const whatsappMessage = settings.whatsappMessage || '';
  
  // Montar URL completo com mensagem
  let fullWhatsAppHref = whatsappLink;
  if (whatsappEnabled && whatsappLink && whatsappMessage) {
    const separator = whatsappLink.includes('?') ? '&' : '?';
    fullWhatsAppHref = `${whatsappLink}${separator}text=${encodeURIComponent(whatsappMessage)}`;
  }

  // Configurações das redes sociais
  const socialLinks = settings.socials?.filter(s => s.url && s.isVisible) || [];

  // Determinar classes do botão WhatsApp baseado no variant
  const whatsappVariant = data.whatsappVariant || 'primary';
  const whatsappButtonClass = whatsappVariant === 'primary' ? 'btn btn-primary' : 'btn btn-outline';

  return (
    <div className="contact-info-block">
      {/* Título e descrição */}
      {data.titleHtml && (
        <div className="contact-info-header">
          <RichText html={data.titleHtml} />
        </div>
      )}
      
      {/* WhatsApp CTA */}
      {whatsappEnabled && whatsappLink && (
        <div className="contact-info-whatsapp">
          <a
            href={fullWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`page-public-button ${whatsappButtonClass}`}
          >
            <span className="page-button-icon"><FontAwesomeIcon icon={faWhatsapp} /></span>
            <span>{data.whatsappLabel}</span>
          </a>
        </div>
      )}
      
      {/* Redes Sociais */}
      {socialLinks.length > 0 && (
        <div className="contact-info-social">
          {data.socialLinksTitle && <h3 style={{ marginBottom: '1rem' }}>{data.socialLinksTitle}</h3>}
          <div className={`social-links-${data.socialLinksVariant || 'list'}`}>
            {socialLinks.map((link: SocialLink) => {
              const iconMap: Record<string, any> = {
                instagram: faInstagram,
                facebook: faFacebook,
                linkedin: faLinkedin,
                youtube: faYoutube,
                tiktok: faTiktok,
                x: faXTwitter,
                site: faGlobe,
                email: faEnvelope,
                whatsapp: faWhatsapp
              };
              
              const icon = iconMap[link.platform] || faLink;
              const variant = data.socialLinksVariant || 'list';
              
              const getLabelForSocial = (social: SocialLink): string => {
                if (social.label) return social.label;
                const labels: Record<string, string> = {
                  instagram: 'Instagram',
                  facebook: 'Facebook',
                  linkedin: 'LinkedIn',
                  youtube: 'YouTube',
                  tiktok: 'TikTok',
                  x: 'X (Twitter)',
                  site: 'Website',
                  email: 'Email',
                  whatsapp: 'WhatsApp'
                };
                return labels[social.platform] || social.platform;
              };
              
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-link social-link--${variant}`}
                >
                  <span className="social-icon"><FontAwesomeIcon icon={icon} /></span>
                  <span className="social-label">{getLabelForSocial(link)}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= RECENT POSTS RENDERER =================
function RecentPostsRenderer({ block }: { block: PageBlock & { type: 'recent-posts' } }) {
  const data = block.data;
  const title = data.title ?? 'Conteúdos recentes';
  const subtitle = data.subtitle ?? 'Leituras curtas para acompanhar você entre as sessões.';
  const ctaLabel = data.ctaLabel ?? 'Ver todos os artigos';
  const ctaHref = data.ctaHref ?? '/blog';
  const postsLimit = data.postsLimit ?? 3;

  const { data: articlesResponse, isLoading } = useQuery<PaginatedResponse<Article>>({
    queryKey: ['articles', 'recent-posts', postsLimit],
    queryFn: () => fetchArticles({ limit: postsLimit, page: 1 })
  });

  const articles = articlesResponse?.items ?? [];

  return (
    <div className="recent-posts-section">
      <div className="section-title">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      
      {isLoading && (
        <div className="recent-posts-grid">
          {Array.from({ length: postsLimit }).map((_, idx) => (
            <div key={idx} className="admin-card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: '200px', width: '100%', marginBottom: '1rem', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '24px', width: '80%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '16px', width: '100%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && articles.length > 0 && (
        <div className="recent-posts-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
      
      {!isLoading && articles.length === 0 && (
        <div className="admin-empty" style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="muted">Nenhum artigo publicado ainda.</p>
        </div>
      )}
      
      {articles.length > 0 && (
        <a href={ctaHref} className="btn btn-outline">
          {ctaLabel}
        </a>
      )}
    </div>
  );
}

// ================= SERVICES RENDERER =================
function ServicesRenderer({ block }: { block: PageBlock & { type: 'services' } }) {
  const data = block.data as ServicesBlockData;
  const sectionTitle = (data.sectionTitle ?? 'Serviços').toString().trim() || 'Serviços';
  const buttonLabel = (data.buttonLabel ?? 'Saiba mais').toString().trim() || 'Saiba mais';
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="services-section">
      <div className="services-header">
        <h2>{sectionTitle}</h2>
        <span className="services-accent" aria-hidden="true" />
      </div>

      <div className="services-grid">
        {items.map((item: { id: string; title: string; description?: string; href: string }) => (
          <div key={item.id} className="service-card">
            <div className="service-icon" aria-hidden="true">
              <img src="/assets/brand/spiral.png" alt="" />
            </div>
            <h3 className="service-card__title">{item.title}</h3>
            {item.description && <p className="service-description">{item.description}</p>}
            <a className="btn btn-outline services-cta" href={item.href || '#'}>
              {buttonLabel}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= FORM RENDERER =================
type FormState = 'idle' | 'submitting' | 'success' | 'error';

function FormRenderer({ block, enableSubmit = true, pageSlug }: { block: PageBlock & { type: 'form' }; enableSubmit?: boolean; pageSlug?: string }) {
  const formData = block.data as FormBlockData;
  const [state, setState] = useState<FormState>('idle');
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>(''); // Anti-spam field

  const validateField = (field: FormBlockData['fields'][0], value: string): string | null => {
    if (field.required && !value.trim()) {
      return 'Este campo é obrigatório';
    }

    if (value.trim() && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'E-mail inválido';
      }
    }

    if (value.trim() && field.type === 'tel') {
      const phoneRegex = /^[\d\s()+-]+$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 8) {
        return 'Telefone inválido';
      }
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Se submissão desabilitada (modo preview), não fazer nada
    if (!enableSubmit) {
      return;
    }

    // Anti-spam: se honeypot preenchido, ignore silenciosamente
    if (honeypot) {
      setState('success');
      return;
    }

    // Validar todos os campos
    const newErrors: Record<string, string> = {};
    for (const field of formData.fields) {
      const value = values[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focar no primeiro campo com erro
      const firstErrorId = Object.keys(newErrors)[0];
      const firstErrorElement = document.getElementById(`field-${firstErrorId}`);
      firstErrorElement?.focus();
      return;
    }

    setState('submitting');
    setErrors({});
    setErrorMessage('');

    try {
      // Submeter via API centralizada
      const resolvedSlug = pageSlug || resolvePageSlugFromLocation();
      await submitForm({
        pageSlug: resolvedSlug,
        formBlockId: block.id,
        formData: values,
        honeypot: honeypot || undefined
      });

      setState('success');
      setValues({}); // Limpar campos após sucesso
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Erro ao enviar formulário. Tente novamente.'
      );
    }
  };

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Limpar erro do campo ao digitar
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Se já foi enviado com sucesso, mostrar apenas mensagem
  if (state === 'success') {
    return (
      <div className="page-public-form form-success">
        <div className="form-success-message">
          <span className="form-success-icon"><FontAwesomeIcon icon={faCheck} /></span>
          <p>{formData.successMessage || 'Mensagem enviada com sucesso!'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-public-form">
      {formData.title && <h2 className="form-title">{formData.title}</h2>}
      {formData.description && <p className="form-description">{formData.description}</p>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot field - hidden from users */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className="form-fields">
          {formData.fields.map((field) => {
            const value = values[field.id] || '';
            const error = errors[field.id];
            const fieldId = `field-${field.id}`;

            return (
              <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`.trim()}>
                <label htmlFor={fieldId}>
                  {field.label}
                  {field.required && <span className="required-mark" aria-label="obrigatório"> *</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={fieldId}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder || undefined}
                    required={field.required}
                    rows={4}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={fieldId}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  >
                    <option value="">Selecione...</option>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={fieldId}
                    type={field.type}
                    name={field.id}
                    value={value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder || undefined}
                    required={field.required}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  />
                )}

                {error && (
                  <span id={`${fieldId}-error`} className="form-field-error" role="alert">
                    {error}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {state === 'error' && errorMessage && (
          <div className="form-error-message" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary form-submit"
          disabled={state === 'submitting'}
        >
          {state === 'submitting' ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span>Enviando...</span>
            </>
          ) : (
            formData.submitLabel || 'Enviar'
          )}
        </button>
      </form>
    </div>
  );
}

function resolvePageSlugFromLocation(): string {
  const path = window.location.pathname;
  if (path === '/' || path === '/home') return 'home';
  const match = path.match(/^\/p\/([^/]+)/);
  if (match) return match[1];
  const parts = path.split('/').filter(Boolean);
  return parts[0] || 'home';
}

// ================= SOCIAL LINKS RENDERER =================
function SocialLinksRenderer({ block }: { block: PageBlock & { type: 'social-links' } }) {
  const data = block.data;
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (isLoading) {
    return (
      <div style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
        Carregando redes sociais...
      </div>
    );
  }

  const socials = settings?.socials?.filter(s => s.url && s.isVisible) || [];

  if (socials.length === 0) {
    return null; // Ocultar bloco se não houver redes configuradas
  }

  const title = data.title || 'Redes Sociais';
  const variant = data.variant || 'list';
  const showIcons = data.showIcons !== false;
  const align = data.align || 'left';

  // Mapa de ícones por tipo
  const getIconForType = (platform: string) => {
    const icons: Record<string, any> = {
      instagram: faInstagram,
      facebook: faFacebook,
      linkedin: faLinkedin,
      youtube: faYoutube,
      tiktok: faTiktok,
      x: faXTwitter,
      site: faGlobe,
      email: faEnvelope,
      whatsapp: faWhatsapp
    };
    return icons[platform] || faLink;
  };

  const getLabelForType = (social: SocialLink): string => {
    if (social.label) return social.label;
    const labels: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      x: 'X (Twitter)',
      site: 'Website',
      email: 'Email',
      whatsapp: 'WhatsApp'
    };
    return labels[social.platform] || social.platform;
  };

  return (
    <div className="social-links-block" style={{ textAlign: align }}>
      {title && <h3 style={{ marginBottom: '1rem' }}>{title}</h3>}
      <div className={`social-links-${variant}`}>
        {socials.map((social) => (
          <a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`social-link social-link--${variant}`}
          >
            {showIcons && <span className="social-icon"><FontAwesomeIcon icon={getIconForType(social.platform)} /></span>}
            <span className="social-label">{getLabelForType(social)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ================= WHATSAPP CTA RENDERER =================
function WhatsAppCtaRenderer({ block }: { block: PageBlock & { type: 'whatsapp-cta' } }) {
  const data = block.data;
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings
  });

  if (isLoading) {
    return (
      <div style={{ padding: '0.85rem 1.35rem', color: '#6b7280', fontSize: '0.9rem', border: '1px dashed #d1d5db', borderRadius: '14px', textAlign: 'center' }}>
        Carregando...
      </div>
    );
  }

  const enabled = settings?.whatsappEnabled ?? false;
  const link = settings?.whatsappLink || '';
  const message = settings?.whatsappMessage || '';
  const hideWhenDisabled = data.hideWhenDisabled || false;

  // Se desabilitado e deve ocultar, não renderiza
  if (!enabled && hideWhenDisabled) {
    return null;
  }

  // Montar URL completo com mensagem
  let fullHref = link;
  if (enabled && link && message) {
    const separator = link.includes('?') ? '&' : '?';
    fullHref = `${link}${separator}text=${encodeURIComponent(message)}`;
  }

  const label = data.label || 'Enviar mensagem no WhatsApp';
  const style = data.style || 'primary';
  const openInNewTab = data.openInNewTab !== false;
  const buttonClass = style === 'primary' ? 'btn btn-primary' : 'btn btn-outline';

  return (
    <div className="whatsapp-cta-wrapper">
      <a
        href={enabled && fullHref ? fullHref : '#'}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noreferrer' : undefined}
        className={`page-public-button ${buttonClass}`}
        style={{
          opacity: enabled ? 1 : 0.6,
          cursor: enabled ? 'pointer' : 'not-allowed',
          pointerEvents: enabled ? 'auto' : 'none'
        }}
        title={!enabled ? 'WhatsApp indisponível' : undefined}
      >
        <span className="page-button-icon"><FontAwesomeIcon icon={faWhatsapp} /></span>
        <span>{label}</span>
      </a>
    </div>
  );
}
