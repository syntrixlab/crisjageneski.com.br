import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { PostService } from '../../services/post.service';
import { sendSuccess } from '../../utils/responses';

const service = new PostService();

const baseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  excerpt: z.string().min(10),
  content: z.string().min(10),
  coverMediaId: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional()
});

export async function listPostsAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listAdmin();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
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

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = baseSchema.partial().parse(req.body);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = await service.update(id, {
      ...payload,
      publishedAt: payload.publishedAt === undefined ? undefined : payload.publishedAt ? new Date(payload.publishedAt) : null
    });
    const changedToDraft = data.status === 'draft' && payload.status !== 'published';
    return sendSuccess(res, { post: data, changedToDraft });
  } catch (error) {
    return next(error);
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await service.delete(id);
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

export async function publishPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = await service.publish(id);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function unpublishPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = await service.unpublish(id);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
