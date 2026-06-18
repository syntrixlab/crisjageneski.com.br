import { SiteSettings, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { toNullableJsonInput } from '../utils/prismaJson';

const DEFAULT_ID = 'default';

export class SiteSettingsRepository {
  async findSingleton(): Promise<SiteSettings | null> {
    return prisma.siteSettings.findUnique({ where: { id: DEFAULT_ID } });
  }

  async createDefault(): Promise<SiteSettings> {
    return prisma.siteSettings.create({
      data: {
        id: DEFAULT_ID,
        siteName: 'Meu Site',
        phone: null,
        address: toNullableJsonInput(null),
        officeHours: toNullableJsonInput(null),
        socials: [],
        whatsappEnabled: false,
        whatsappLink: null,
        whatsappMessage: null,
        whatsappPosition: 'right',
        hideScheduleCta: false,
        brandTagline: 'Psicologia Junguiana',
        theme: {},
        metaDescription: null,
        ogImageUrl: null,
        gaId: null,
        gscVerification: null
      }
    });
  }

  async upsert(data: Prisma.SiteSettingsUpdateInput): Promise<SiteSettings> {
    return prisma.siteSettings.upsert({
      where: { id: DEFAULT_ID },
      create: {
        id: DEFAULT_ID,
        siteName: (data.siteName as string) ?? 'Meu Site',
        cnpj: (data.cnpj as string | null) ?? null,
        crp: (data.crp as string | null) ?? null,
        contactEmail: (data.contactEmail as string | null) ?? null,
        logoUrl: (data.logoUrl as string | null) ?? null,
        socials: data.socials ?? [],
        whatsappEnabled: (data as any).whatsappEnabled ?? false,
        whatsappLink: (data as any).whatsappLink ?? null,
        whatsappMessage: (data as any).whatsappMessage ?? null,
        whatsappPosition: (data as any).whatsappPosition ?? 'right',
        hideScheduleCta: (data as any).hideScheduleCta ?? false,
        brandTagline: (data as any).brandTagline ?? 'Psicologia Junguiana',
        theme: (data as any).theme ?? {}
      },
      update: data
    });
  }
}
