import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MediaService } from '../../services/media.service';
import { sendSuccess } from '../../utils/responses';

const service = new MediaService();

const uploadSchema = z.object({
  alt: z.string().optional()
});

const updateSchema = z.object({
  alt: z.string().optional().nullable()
});

const cropSchema = z.object({
  cropX: z.number(),
  cropY: z.number(),
  cropWidth: z.number(),
  cropHeight: z.number(),
  cropRatio: z.string().optional()
});

export async function listMedia(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.list();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = uploadSchema.parse(req.body);
    const file = (req as Request).file as Express.Multer.File | undefined;
    const media = await service.upload(file, payload.alt);
    return sendSuccess(
      res,
      {
        mediaId: media.id,
        url: media.url,
        width: media.width,
        height: media.height,
        alt: media.alt
      },
      201
    );
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
    const media = await service.update(id, file, payload.alt ?? undefined);
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
