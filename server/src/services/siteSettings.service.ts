import { SiteSettings } from '@prisma/client';
import { SiteSettingsRepository } from '../repositories/siteSettings.repository';

export type SocialLink = {
  id: string;
  platform: string;
  label?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
};

export type SiteSettingsInput = {
  siteName: string;
  cnpj?: string | null;
  crp?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  socials?: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
};

export class SiteSettingsService {
  private repository = new SiteSettingsRepository();

  private async ensureSettings(): Promise<SiteSettings> {
    const existing = await this.repository.findSingleton();
    if (existing) return existing;
    return this.repository.createDefault();
  }

  async getPublic(): Promise<SiteSettingsInput> {
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
      socials: visibleSocials,
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: normalizedWhatsapp ?? null,
      whatsappMessage: settings.whatsappMessage ?? null,
      whatsappPosition: (settings.whatsappPosition as any) ?? 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      brandTagline: settings.brandTagline ?? null
    };
  }

  async getAdmin(): Promise<SiteSettingsInput> {
    const settings = await this.ensureSettings();
    return {
      siteName: settings.siteName,
      cnpj: settings.cnpj,
      crp: settings.crp,
      contactEmail: settings.contactEmail,
      logoUrl: settings.logoUrl,
      socials: Array.isArray(settings.socials) ? (settings.socials as SocialLink[]) : [],
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: settings.whatsappLink ?? null,
      whatsappMessage: settings.whatsappMessage ?? null,
      whatsappPosition: (settings.whatsappPosition as any) ?? 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      brandTagline: settings.brandTagline ?? null
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

    const normalizedWhatsapp = normalizeWhatsapp(payload.whatsappLink, payload.whatsappMessage);
    const normalizedTagline = (payload.brandTagline ?? '').toString().trim();
    const updated = await this.repository.upsert({
      siteName: payload.siteName,
      cnpj: sanitizedCnpj || null,
      crp: payload.crp ?? null,
      contactEmail: payload.contactEmail ?? null,
      logoUrl: payload.logoUrl ?? null,
      socials: ordered,
      whatsappEnabled: payload.whatsappEnabled ?? false,
      whatsappLink: normalizedWhatsapp ?? null,
      whatsappMessage: payload.whatsappMessage ?? null,
      whatsappPosition: payload.whatsappPosition ?? 'right',
      hideScheduleCta: payload.hideScheduleCta ?? false,
      brandTagline: normalizedTagline.length > 0 ? normalizedTagline.slice(0, 80) : null
    });

    return {
      siteName: updated.siteName,
      cnpj: updated.cnpj,
      crp: updated.crp,
      contactEmail: updated.contactEmail,
      logoUrl: updated.logoUrl,
      socials: Array.isArray(updated.socials) ? (updated.socials as SocialLink[]) : [],
      whatsappEnabled: updated.whatsappEnabled ?? false,
      whatsappLink: normalizedWhatsapp ?? null,
      whatsappMessage: updated.whatsappMessage ?? null,
      whatsappPosition: (updated.whatsappPosition as any) ?? 'right',
      hideScheduleCta: updated.hideScheduleCta ?? false,
      brandTagline: updated.brandTagline ?? null
    };
  }
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
