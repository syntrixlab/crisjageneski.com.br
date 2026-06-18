import { SiteSettings } from '@prisma/client';
import { cacheKeys, cacheTTL, cacheProvider } from '../config/cache';
import { SiteSettingsRepository } from '../repositories/siteSettings.repository';
import { toNullableJsonInput } from '../utils/prismaJson';
import { normalizeSiteTheme } from '../utils/siteTheme';

export type SocialLink = {
  id: string;
  platform: string;
  label?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
};

export type OfficeHour = {
  label: string;
  hours: string;
};

export type SiteAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type SiteSettingsInput = {
  siteName: string;
  cnpj?: string | null;
  crp?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: SiteAddress | null;
  officeHours?: OfficeHour[] | null;
  socials?: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
  theme?: unknown;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  gaId?: string | null;
  gscVerification?: string | null;
};

export class SiteSettingsService {
  private repository = new SiteSettingsRepository();

  private async ensureSettings(): Promise<SiteSettings> {
    const existing = await this.repository.findSingleton();
    if (existing) return existing;
    return this.repository.createDefault();
  }

  async getPublic(): Promise<SiteSettingsInput> {
    return cacheProvider.wrap(cacheKeys.siteSettings, cacheTTL.siteSettings, async () => {
      const settings = await this.ensureSettings();
      const socials = Array.isArray(settings.socials) ? (settings.socials as SocialLink[]) : [];
      const visibleSocials = socials
        .filter((item) => item?.isVisible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const normalizedWhatsapp = normalizeWhatsapp(settings.whatsappLink, settings.whatsappMessage);
      return {
        siteName: settings.siteName,
        cnpj: settings.cnpj,
        crp: settings.crp,
        contactEmail: settings.contactEmail,
        logoUrl: settings.logoUrl,
        phone: (settings as any).phone ?? null,
        address: (settings as any).address ?? null,
        officeHours: (settings as any).officeHours ?? null,
        socials: visibleSocials,
        whatsappEnabled: settings.whatsappEnabled ?? false,
        whatsappLink: normalizedWhatsapp ?? null,
        whatsappMessage: settings.whatsappMessage ?? null,
        whatsappPosition: (settings.whatsappPosition as any) ?? 'right',
        hideScheduleCta: settings.hideScheduleCta ?? false,
        brandTagline: settings.brandTagline ?? null,
        theme: normalizeSiteTheme((settings as any).theme),
        metaDescription: (settings as any).metaDescription ?? null,
        ogImageUrl: (settings as any).ogImageUrl ?? null,
        gaId: (settings as any).gaId ?? null,
        gscVerification: (settings as any).gscVerification ?? null
      };
    });
  }

  async getAdmin(): Promise<SiteSettingsInput> {
    const settings = await this.ensureSettings();
    return {
      siteName: settings.siteName,
      cnpj: settings.cnpj,
      crp: settings.crp,
      contactEmail: settings.contactEmail,
      logoUrl: settings.logoUrl,
      phone: (settings as any).phone ?? null,
      address: (settings as any).address ?? null,
      officeHours: (settings as any).officeHours ?? null,
      socials: Array.isArray(settings.socials) ? (settings.socials as SocialLink[]) : [],
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: settings.whatsappLink ?? null,
      whatsappMessage: settings.whatsappMessage ?? null,
      whatsappPosition: (settings.whatsappPosition as any) ?? 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      brandTagline: settings.brandTagline ?? null,
      theme: normalizeSiteTheme((settings as any).theme),
      metaDescription: (settings as any).metaDescription ?? null,
      ogImageUrl: (settings as any).ogImageUrl ?? null,
      gaId: (settings as any).gaId ?? null,
      gscVerification: (settings as any).gscVerification ?? null
    };
  }

  async update(payload: SiteSettingsInput): Promise<SiteSettingsInput> {
    const sanitizedCnpj = payload.cnpj ? payload.cnpj.replace(/\D/g, '') : null;
    const socials = Array.isArray(payload.socials) ? payload.socials : [];
    const ordered = socials
      .map((item, index) => ({
        ...item,
        order: item.order ?? index
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const normalizedTagline = (payload.brandTagline ?? '').toString().trim();
    const theme = normalizeSiteTheme(payload.theme);
    // Salva o link bruto (somente telefone ou URL base, sem ?text=).
    // A normalização completa ocorre apenas na leitura pública (getPublic).
    const rawWhatsappLink = extractRawWhatsappLink(payload.whatsappLink);
    const updated = await this.repository.upsert({
      siteName: payload.siteName,
      cnpj: sanitizedCnpj || null,
      crp: payload.crp ?? null,
      contactEmail: payload.contactEmail ?? null,
      logoUrl: payload.logoUrl ?? null,
      phone: payload.phone ?? null,
      address: toNullableJsonInput(payload.address),
      officeHours: toNullableJsonInput(payload.officeHours),
      socials: ordered,
      whatsappEnabled: payload.whatsappEnabled ?? false,
      whatsappLink: rawWhatsappLink ?? null,
      whatsappMessage: payload.whatsappMessage ?? null,
      whatsappPosition: payload.whatsappPosition ?? 'right',
      hideScheduleCta: payload.hideScheduleCta ?? false,
      brandTagline: normalizedTagline.length > 0 ? normalizedTagline.slice(0, 80) : null,
      theme: theme as any,
      metaDescription: payload.metaDescription ?? null,
      ogImageUrl: payload.ogImageUrl ?? null,
      gaId: payload.gaId ?? null,
      gscVerification: payload.gscVerification ?? null
    });

    return {
      siteName: updated.siteName,
      cnpj: updated.cnpj,
      crp: updated.crp,
      contactEmail: updated.contactEmail,
      logoUrl: updated.logoUrl,
      phone: (updated as any).phone ?? null,
      address: (updated as any).address ?? null,
      officeHours: (updated as any).officeHours ?? null,
      socials: Array.isArray(updated.socials) ? (updated.socials as SocialLink[]) : [],
      whatsappEnabled: updated.whatsappEnabled ?? false,
      whatsappLink: updated.whatsappLink ?? null,
      whatsappMessage: updated.whatsappMessage ?? null,
      whatsappPosition: (updated.whatsappPosition as any) ?? 'right',
      hideScheduleCta: updated.hideScheduleCta ?? false,
      brandTagline: updated.brandTagline ?? null,
      theme: normalizeSiteTheme((updated as any).theme),
      metaDescription: (updated as any).metaDescription ?? null,
      ogImageUrl: (updated as any).ogImageUrl ?? null,
      gaId: (updated as any).gaId ?? null,
      gscVerification: (updated as any).gscVerification ?? null
    };
  }
}

// Extracts the raw value before saving to DB.
// If the link is already a normalized wa.me URL, return only the phone digits
// to prevent digit accumulation from encoded ?text= on each save.
function extractRawWhatsappLink(link?: string | null): string | null {
  const raw = (link || '').trim();
  if (!raw) return null;
  const waMeMatch = raw.match(/^https?:\/\/wa\.me\/(\d+)/i);
  if (waMeMatch) return waMeMatch[1];
  return raw;
}

function normalizeWhatsapp(link?: string | null, message?: string | null): string | null {
  const raw = (link || '').trim();
  const msg = (message || '').trim();
  if (raw || msg) {
    // if link is only digits, treat as phone
    const digits = raw.replace(/\D/g, '');
    if (digits && msg) return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    if (digits) return `https://wa.me/${digits}`;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }
  return null;
}
