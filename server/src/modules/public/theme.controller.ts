import { Request, Response, NextFunction } from 'express';
import { getThemeFromCache } from '../../services/themeCache.service';
import { sendSuccess } from '../../utils/responses';
import { HttpError } from '../../utils/errors';
import { normalizeSiteTheme } from '../../utils/siteTheme';

/**
 * GET /api/public/theme
 * Returns all public site config (cached in Redis).
 * Includes: theme, branding, socials, WhatsApp, etc.
 */
function normalizeWhatsappLink(link?: string | null, message?: string | null): string | null {
  const raw = (link || '').trim();
  const msg = (message || '').trim();
  if (!raw && !msg) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits && msg) return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
  if (digits) return 'https://wa.me/' + digits;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return 'https://' + raw;
}

export async function getTheme(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getThemeFromCache();

    if (!settings) {
      return next(new HttpError(404, 'Site settings not found'));
    }

    res.set('Cache-Control', 'public, max-age=86400');

    const socials = Array.isArray(settings.socials) ? (settings.socials as any[]) : [];
    const visibleSocials = socials
      .filter((item) => item?.isVisible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const whatsappLink = normalizeWhatsappLink(settings.whatsappLink, settings.whatsappMessage);

    return sendSuccess(res, {
      siteName: settings.siteName,
      brandTagline: settings.brandTagline || null,
      logoUrl: settings.logoUrl || null,
      contactEmail: settings.contactEmail || null,
      cnpj: settings.cnpj || null,
      crp: settings.crp || null,
      socials: visibleSocials,
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: whatsappLink || null,
      whatsappMessage: settings.whatsappMessage || null,
      whatsappPosition: settings.whatsappPosition || 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      theme: normalizeSiteTheme((settings as any).theme)
    });
  } catch (error) {
    return next(error);
  }
}
