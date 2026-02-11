import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { PageService } from '../../services/page.service';
import { sendSuccess } from '../../utils/responses';
import { pageLayoutSchema } from '../../utils/pageLayout';
import { HomeService } from '../../services/home.service';
import { HttpError } from '../../utils/errors';

const service = new PageService();
const homeService = new HomeService();

const baseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras, números e hifens para o slug'),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  layout: pageLayoutSchema.default({ version: 1, columns: 1, cols: [] }),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().nullable().optional()
});

export async function listPages(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listAdmin();
    // [DEBUG] Log temporário para validação
    console.log('[BACKEND] GET /api/admin/pages - Status: 200, Total páginas:', Array.isArray(data) ? data.length : 'not array');
    console.log('[BACKEND] Páginas retornadas:', data.map((p: any) => ({ id: p.id, title: p.title, slug: p.slug, pageKey: p.pageKey, status: p.status })));
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function createPage(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = baseSchema.parse(req.body);
    const data = await service.create({
      ...payload,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null
    });
    return sendSuccess(res, data, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updatePage(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = baseSchema.partial().parse(req.body);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    
    // [DEBUG B1] Log Hero no payload ANTES de normalizar
    if (payload.layout) {
      const anyLayout = payload.layout as any;
      const heroSection = anyLayout.sections?.find((s: any) => s.kind === 'hero' || s.cols?.some((c: any) => c.blocks?.some((b: any) => b.type === 'hero')));
      if (heroSection) {
        const heroBlock = heroSection.cols?.flatMap((c: any) => c.blocks || []).find((b: any) => b.type === 'hero');
        if (heroBlock) {
          console.log('[BACKEND B1] Hero recebido via PUT:');
          console.log('  - version:', heroBlock.data?.version);
          console.log('  - rightVariant:', heroBlock.data?.rightVariant);
          console.log('  - right blocks:', heroBlock.data?.right?.map((b: any) => b.type));
        }
      }
    }
    
    const existing = await service.getAdminById(id);
    const isHome = existing.pageKey === 'home' || existing.slug === 'home';
    if (isHome) {
      const { page } = await homeService.updateHome(id, {
        title: payload.title,
        description: payload.description,
        layout: payload.layout
      });
      return sendSuccess(res, { page, changedToDraft: false });
    }

    const { page, changedToDraft } = await service.update(id, {
      ...payload,
      publishedAt: payload.publishedAt === undefined ? undefined : payload.publishedAt ? new Date(payload.publishedAt) : null
    });
    return sendSuccess(res, { page, changedToDraft });
  } catch (error) {
    return next(error);
  }
}

export async function getPageAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = await service.getAdminById(id);
    if (data.pageKey === 'home' || data.slug === 'home') {
      const home = await homeService.getAdmin();
      return sendSuccess(res, home);
    }
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function publishPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const page = await service.getAdminById(id);
    if (page.pageKey === 'home' || page.slug === 'home') {
      throw new HttpError(400, 'A home j\u00e1 fica publicada automaticamente.');
    }
    const data = await service.publish(id);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function unpublishPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const page = await service.getAdminById(id);
    if (page.pageKey === 'home' || page.slug === 'home') {
      throw new HttpError(400, 'A home não pode ser despublicada.');
    }
    const data = await service.unpublish(id);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function deletePage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const page = await service.getAdminById(id);
    if (page.pageKey === 'home' || page.slug === 'home') {
      throw new HttpError(400, 'A home não pode ser removida.');
    }
    await service.delete(id);
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}
