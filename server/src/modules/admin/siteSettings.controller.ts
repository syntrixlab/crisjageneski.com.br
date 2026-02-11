import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { SiteSettingsService } from '../../services/siteSettings.service';
import { sendSuccess } from '../../utils/responses';

const service = new SiteSettingsService();

const cnpjSchema = z
  .string()
  .optional()
  .transform((value) => (value ? value.replace(/\D/g, '') : undefined))
  .refine((value) => !value || value.length === 14, 'CNPJ deve ter 14 dígitos');

const socialPlatforms = [
  'instagram',
  'whatsapp',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'site',
  'email',
  'telefone',
  'custom'
] as const;

const urlSchema = z
  .string()
  .min(3)
  .refine((value) => {
    if (/^mailto:/i.test(value)) return true;
    if (/^tel:/i.test(value)) return true;
    try {
      // Allow http/https and wa.me links
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL inválida');

const socialLinkSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(socialPlatforms),
  label: z.string().optional(),
  url: urlSchema,
  order: z.number().int(),
  isVisible: z.boolean().default(true)
});

const settingsSchema = z.object({
  siteName: z.string().min(2),
  cnpj: cnpjSchema.nullable().optional(),
  crp: z.string().trim().max(32).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  socials: z.array(socialLinkSchema).optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappLink: z.string().min(3).nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
  whatsappPosition: z.enum(['right', 'left']).optional(),
  hideScheduleCta: z.boolean().optional(),
  brandTagline: z.string().max(80).nullable().optional()
});

export async function getSiteSettingsAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getAdmin();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function updateSiteSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = settingsSchema.parse(req.body);
    const data = await service.update(payload);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
