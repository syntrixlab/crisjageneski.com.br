import { Media, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export class MediaRepository {
  list(): Promise<Media[]> {
    return prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<Media | null> {
    return prisma.media.findUnique({ where: { id } });
  }

  create(data: Prisma.MediaCreateInput): Promise<Media> {
    return prisma.media.create({ data });
  }

  update(id: string, data: Prisma.MediaUpdateInput): Promise<Media> {
    return prisma.media.update({ where: { id }, data });
  }

  delete(id: string): Promise<Media> {
    return prisma.media.delete({ where: { id } });
  }
}
