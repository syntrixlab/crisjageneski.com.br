import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { PageService } from '../../services/page.service';
import { sendSuccess } from '../../utils/responses';

const service = new PageService();

export async function getPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = z.object({ slug: z.string().min(2).regex(/^[a-z0-9-]+$/i) }).parse(req.params);
    const data = await service.getPublishedBySlug(slug);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
