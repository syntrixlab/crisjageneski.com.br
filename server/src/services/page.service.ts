import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { normalizePageLayout } from '../utils/pageLayout';

const repository = new PageRepository();

export type PageInput = {
  slug: string;
  pageKey?: string | null;
  title: string;
  description?: string | null;
  layout: unknown;
  status?: PageStatus;
  publishedAt?: Date | null;
};

export class PageService {
  async getPublishedBySlug(slug: string): Promise<Page> {
    if (slug === 'home') throw new HttpError(404, 'Page not found');
    return cacheProvider.wrap(cacheKeys.page(slug), cacheTTL.page, async () => {
      const page = await repository.findPublishedBySlug(slug);
      if (!page || page.pageKey === 'home') throw new HttpError(404, 'Page not found');
      return page;
    });
  }

  async getPublishedByKey(pageKey: string): Promise<Page> {
    if (pageKey === 'home') throw new HttpError(404, 'Page not found');
    const page = await repository.findPublishedByPageKey(pageKey);
    if (!page) throw new HttpError(404, 'Page not found');
    return page;
  }

  async getAdminById(id: string): Promise<Page> {
    const page = await repository.findById(id);
    if (!page) throw new HttpError(404, 'Page not found');
    return page;
  }

  async listAdmin(includeHome = false): Promise<Page[]> {
    console.log('[PageService] listAdmin chamado, includeHome:', includeHome);
    
    let pages: Page[];
    if (includeHome) {
      pages = await repository.findAll();
    } else {
      pages = await repository.findAll({ excludePageKey: 'home', excludeSlug: 'home' });
    }
    
    console.log('[PageService] Total páginas do banco:', pages.length);
    console.log('[PageService] Páginas:', pages.map(p => ({ id: p.id, title: p.title, slug: p.slug, pageKey: p.pageKey })));
    
    return pages;
  }

  async create(payload: PageInput): Promise<Page> {
    const layout = normalizePageLayout(payload.layout);
    const status: PageStatus = payload.status ?? PageStatus.draft;
    const publishedAt = status === PageStatus.published ? payload.publishedAt ?? new Date() : null;
    const slug = payload.slug.trim().toLowerCase();
    const pageKey = payload.pageKey?.trim().toLowerCase() || null;
    if (pageKey === 'home' || slug === 'home') {
      throw new HttpError(400, 'Use o endpoint dedicado para criar/editar a home.');
    }

    const created = await repository.create({
      slug,
      pageKey,
      title: payload.title,
      description: payload.description ?? null,
      layout: layout as Prisma.InputJsonValue,
      status,
      publishedAt
    });
    await cacheProvider.del(cacheKeys.page(slug));
    return created;
  }

  async update(id: string, payload: Partial<PageInput>): Promise<{ page: Page; changedToDraft: boolean }> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    const isHome = existing.pageKey === 'home' || existing.slug === 'home';

    if (payload.pageKey && payload.pageKey !== existing.pageKey) {
      throw new HttpError(400, 'pageKey não pode ser alterada por este endpoint');
    }

    const hasContentChange =
      payload.slug !== undefined ||
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.layout !== undefined;

    const statusBefore = existing.status;
    const nextStatus: PageStatus =
      statusBefore === PageStatus.published && hasContentChange ? PageStatus.draft : payload.status ?? existing.status;

    const slug = payload.slug ? payload.slug.trim().toLowerCase() : undefined;
    if (slug === 'home' || (isHome && slug && slug !== 'home')) {
      throw new HttpError(400, 'Slug da home não pode ser alterado por este endpoint');
    }

    const nextPublishedAt =
      nextStatus === PageStatus.published
        ? payload.publishedAt ?? existing.publishedAt ?? new Date()
        : payload.publishedAt ?? (statusBefore === PageStatus.published && hasContentChange ? existing.publishedAt : null);

    const layout = payload.layout !== undefined ? normalizePageLayout(payload.layout) : undefined;

    const updated = await repository.update(id, {
      slug: slug ?? undefined,
      title: payload.title ?? undefined,
      description: payload.description === undefined ? undefined : payload.description ?? null,
      layout: layout as Prisma.InputJsonValue | undefined,
      status: nextStatus,
      publishedAt: nextPublishedAt ?? undefined
    });

    await cacheProvider.del(cacheKeys.page(existing.slug));
    if (slug && slug !== existing.slug) {
      await cacheProvider.del(cacheKeys.page(slug));
    }

    const changedToDraft = statusBefore === PageStatus.published && updated.status === PageStatus.draft;
    return { page: updated, changedToDraft };
  }

  async delete(id: string): Promise<void> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page cannot be removed');
    }
    await repository.delete(id);
    await cacheProvider.del(cacheKeys.page(existing.slug));
  }

  async publish(id: string): Promise<Page> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page is always published');
    }
    const updated = await repository.update(id, { status: PageStatus.published, publishedAt: new Date() });
    await cacheProvider.del(cacheKeys.page(existing.slug));
    return updated;
  }

  async unpublish(id: string): Promise<Page> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (existing.pageKey === 'home' || existing.slug === 'home') {
      throw new HttpError(400, 'Home page cannot be unpublished');
    }
    const updated = await repository.update(id, { status: PageStatus.draft, publishedAt: null });
    await cacheProvider.del(cacheKeys.page(existing.slug));
    return updated;
  }
}
