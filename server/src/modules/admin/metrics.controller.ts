import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess } from '../../utils/responses';

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const [
      pagesPublished,
      pagesDraft,
      articlesPublished,
      articlesDraft,
      totalArticleViews,
      totalImages,
      totalArticles,
      totalPages
    ] = await Promise.all([
      prisma.page.count({ where: { status: 'published' } }),
      prisma.page.count({ where: { status: 'draft' } }),
      prisma.post.count({ where: { status: 'published' } }),
      prisma.post.count({ where: { status: 'draft' } }),
      prisma.post.aggregate({ _sum: { views: true }, where: { status: 'published' } }),
      prisma.media.count(),
      prisma.post.count(),
      prisma.page.count()
    ]);

    return sendSuccess(res, {
      pagesPublished,
      pagesDraft,
      articlesPublished,
      articlesDraft,
      totalArticleViews: totalArticleViews._sum?.views ?? 0,
      totalImages,
      totalArticles,
      totalPages
    });
  } catch (error) {
    return next(error);
  }
}
