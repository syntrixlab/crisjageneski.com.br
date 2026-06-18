import { Media } from '@prisma/client';
import { MediaRepository } from '../repositories/media.repository';
import { storageProvider } from '../config/storage';
import { HttpError } from '../utils/errors';
import { env } from '../config/env';
import { cacheKeys, cacheProvider } from '../config/cache';

const repository = new MediaRepository();
const allowedTypes = env.ALLOWED_IMAGE_MIME_TYPES.split(',').map((t) => t.trim());
const maxBytes = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

type MediaMeta = {
  alt?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

type ListOptions = {
  search?: string;
  tag?: string;
};

export class MediaService {
  async list(opts: ListOptions = {}): Promise<Media[]> {
    return repository.list(opts);
  }

  async upload(file: Express.Multer.File | undefined, meta: MediaMeta = {}): Promise<Media> {
    if (!file) throw new HttpError(400, 'File is required');
    if (!file.mimetype.startsWith('image/')) throw new HttpError(400, 'Only image uploads are allowed');
    if (!allowedTypes.includes(file.mimetype)) throw new HttpError(400, 'Unsupported image type');
    if (file.size > maxBytes) throw new HttpError(400, 'Image exceeds ' + env.UPLOAD_MAX_FILE_SIZE_MB + 'MB');

    const uploadResult = await storageProvider.uploadImage(file.buffer, file.originalname, file.mimetype, {
      cacheControl: '86400',
      maxWidth: 1920,
      maxHeight: 1920,
      convertToWebp: true
    });

    const media = await repository.create({
      path: uploadResult.path,
      url: uploadResult.url,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      width: uploadResult.width ?? undefined,
      height: uploadResult.height ?? undefined,
      alt: meta.alt ?? null,
      title: meta.title ?? null,
      description: meta.description ?? null,
      tags: meta.tags ?? []
    } as any);

    await cacheProvider.del([cacheKeys.postsList]);
    return media;
  }

  async update(id: string, file: Express.Multer.File | undefined, meta: Partial<MediaMeta> = {}): Promise<Media> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Media not found');

    let uploadResult: Awaited<ReturnType<typeof storageProvider.uploadImage>> | null = null;
    if (file) {
      if (!file.mimetype.startsWith('image/')) throw new HttpError(400, 'Only image uploads are allowed');
      if (!allowedTypes.includes(file.mimetype)) throw new HttpError(400, 'Unsupported image type');
      if (file.size > maxBytes) throw new HttpError(400, 'Image exceeds ' + env.UPLOAD_MAX_FILE_SIZE_MB + 'MB');

      await storageProvider.delete(existing.path);
      uploadResult = await storageProvider.uploadImage(file.buffer, file.originalname, file.mimetype, {
        cacheControl: '86400',
        maxWidth: 1920,
        maxHeight: 1920,
        convertToWebp: true
      });
    }

    const updated = await repository.update(id, {
      ...(meta.alt !== undefined && { alt: meta.alt }),
      ...(meta.title !== undefined && { title: meta.title } as any),
      ...(meta.description !== undefined && { description: meta.description } as any),
      ...(meta.tags !== undefined && { tags: meta.tags } as any),
      ...(uploadResult && {
        path: uploadResult.path,
        url: uploadResult.url,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        width: uploadResult.width ?? undefined,
        height: uploadResult.height ?? undefined
      })
    });

    await cacheProvider.del([cacheKeys.postsList]);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const media = await repository.findById(id);
    if (!media) throw new HttpError(404, 'Media not found');
    await storageProvider.delete(media.path);
    await repository.delete(id);
    await cacheProvider.del([cacheKeys.postsList]);
  }

  async saveCrop(id: string, cropData: {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    cropRatio?: string;
  }): Promise<Media> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Media not found');

    const updated = await repository.update(id, {
      cropX: cropData.cropX,
      cropY: cropData.cropY,
      cropWidth: cropData.cropWidth,
      cropHeight: cropData.cropHeight,
      cropRatio: cropData.cropRatio ?? null
    });

    await cacheProvider.del([cacheKeys.postsList]);
    return updated;
  }
}
