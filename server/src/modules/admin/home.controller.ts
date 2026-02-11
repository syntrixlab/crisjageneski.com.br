import { NextFunction, Request, Response } from 'express';
import { HomeService } from '../../services/home.service';
import { sendSuccess } from '../../utils/responses';
import { z } from 'zod';

const service = new HomeService();

export async function ensureHome(_req: Request, res: Response, next: NextFunction) {
  try {
    const page = await service.ensureHome();
    return sendSuccess(res, { pageId: page.id, pageKey: page.pageKey });
  } catch (error) {
    return next(error);
  }
}

export async function getHomeAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const page = await service.getAdmin();
    return sendSuccess(res, page);
  } catch (error) {
    return next(error);
  }
}

export async function updateHomeContent(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = z
      .object({
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        layout: z.unknown().optional()
      })
      .parse(req.body);
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const { page } = await service.updateHome(id, payload);
    return sendSuccess(res, { page, changedToDraft: false });
  } catch (error) {
    return next(error);
  }
}
