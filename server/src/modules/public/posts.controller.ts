import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { PostService } from '../../services/post.service';
import { sendSuccess } from '../../utils/responses';

const service = new PostService();

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = z
      .object({
        search: z.string().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        excludeIds: z.string().optional()
      })
      .parse(req.query);

    const excludeIds = query.excludeIds
      ? query.excludeIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const data = await service.listPaginated({
      search: query.search,
      page: query.page,
      limit: query.limit,
      excludeIds
    });
    
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function listFeaturedPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit } = z.object({ limit: z.coerce.number().optional() }).parse(req.query);
    const parsedLimit = Math.min(Math.max(limit ?? 3, 0), 3);
    const data = await service.listFeatured(parsedLimit || 3);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getBlogHome(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getBlogHome();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function listMostViewedPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = z
      .object({
        limit: z.coerce.number().optional(),
        excludeIds: z.string().optional()
      })
      .parse(req.query);
    const parsedLimit = Math.min(Math.max(query.limit ?? 3, 0), 3);
    const excludeIds = query.excludeIds
      ? query.excludeIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;
    const data = await service.listMostViewed(parsedLimit || 3, excludeIds);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = z.object({ slug: z.string() }).parse(req.params);
    const data = await service.getPublicBySlug(slug);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function incrementView(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const views = await service.incrementViews(id);
    res.setHeader('Cache-Control', 'no-store');
    return sendSuccess(res, { views });
  } catch (error) {
    return next(error);
  }
}
