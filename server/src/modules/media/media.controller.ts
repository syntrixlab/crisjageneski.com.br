import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MediaService } from '../../services/media.service';
import { sendSuccess } from '../../utils/responses';

const service = new MediaService();

const uploadSchema = z.object({
  alt: z.string().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional()
});

const updateSchema = z.object({
  alt: z.string().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional()
});

const cropSchema = z.object({
  cropX: z.number(),
  cropY: z.number(),
  cropWidth: z.number(),
  cropHeight: z.number(),
  cropRatio: z.string().optional()
});

function parseTags(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .flatMap((t) => t.split(','))
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export async function listMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const data = await service.list({ search, tag });
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = uploadSchema.parse(req.body);
    const file = (req as Request).file as Express.Multer.File | undefined;
    const media = await service.upload(file, {
      alt: payload.alt,
      title: payload.title,
      description: payload.description,
      tags: parseTags(payload.tags)
    });
    return sendSuccess(res, {
      mediaId: media.id,
      url: media.url,
      width: media.width,
      height: media.height,
      alt: media.alt,
      title: (media as any).title,
      description: (media as any).description,
      tags: (media as any).tags ?? []
    }, 201);
  } catch (error) {
    return next(error);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await service.delete(id);
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

export async function updateMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const payload = updateSchema.parse(req.body);
    const file = (req as Request).file as Express.Multer.File | undefined;
    const media = await service.update(id, file, {
      alt: payload.alt ?? undefined,
      title: payload.title ?? undefined,
      description: payload.description ?? undefined,
      tags: payload.tags !== undefined ? parseTags(payload.tags) : undefined
    });
    return sendSuccess(res, media);
  } catch (error) {
    return next(error);
  }
}

export async function saveCrop(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const payload = cropSchema.parse(req.body);
    const media = await service.saveCrop(id, payload);
    return sendSuccess(res, media);
  } catch (error) {
    return next(error);
  }
}
