import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { ensureHeroAtTop, normalizePageLayout, type PageLayoutV2 } from '../utils/pageLayout';

const repository = new PageRepository();

export class HomeService {
  private normalizeHomeLayout(layout: unknown, now: string): PageLayoutV2 {
    const normalized = normalizePageLayout(layout);
    return ensureHeroAtTop(normalized, now);
  }

  private filterVisibleBlocks(layout: PageLayoutV2): PageLayoutV2 {
    return {
      ...layout,
      sections: (layout.sections || []).map((section) => ({
        ...section,
        cols: section.cols.map((col) => ({
          ...col,
          blocks: col.blocks.filter((block) => block.visible !== false)
        }))
      }))
    };
  }

  private async upsertHome(now: string): Promise<Page> {
    const existing = await repository.findBySlugOrKey('home');
    const baseLayout = existing ? this.normalizeHomeLayout(existing.layout, now) : this.normalizeHomeLayout({ version: 2, sections: [] }, now);

    if (!existing) {
      const created = await repository.create({
        slug: 'home',
        pageKey: 'home',
        title: 'P\u00e1gina Inicial',
        description: 'P\u00e1gina inicial do site',
        layout: baseLayout as Prisma.InputJsonValue,
        status: PageStatus.published,
        publishedAt: new Date()
      });
      await this.clearCache();
      return created;
    }

    const needsUpdate =
      existing.slug !== 'home' ||
      existing.pageKey !== 'home' ||
      existing.status !== PageStatus.published ||
      !existing.publishedAt ||
      JSON.stringify(existing.layout) !== JSON.stringify(baseLayout);

    if (!needsUpdate) {
      return existing;
    }

    const updated = await repository.update(existing.id, {
      slug: 'home',
      pageKey: 'home',
      title: existing.title || 'P\u00e1gina Inicial',
      description: existing.description ?? null,
      layout: baseLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.clearCache();
    return updated;
  }

  async ensureHome(): Promise<Page> {
    const now = new Date().toISOString();
    return this.upsertHome(now);
  }

  async getAdmin(): Promise<Page> {
    return this.ensureHome();
  }

  async getPublic(): Promise<Page> {
    return cacheProvider.wrap(cacheKeys.home, cacheTTL.home, async () => {
      const page = await this.ensureHome();
      if (page.status !== PageStatus.published) {
        throw new HttpError(404, 'Home não publicada');
      }
      const layout = this.filterVisibleBlocks(page.layout as PageLayoutV2);
      return { ...page, layout };
    });
  }

  async updateHome(id: string, payload: Partial<{ title?: string; description?: string | null; layout?: unknown }>): Promise<{ page: Page; changedToDraft: boolean }> {
    const existing = await repository.findById(id);
    if (!existing || (existing.pageKey !== 'home' && existing.slug !== 'home')) {
      throw new HttpError(404, 'Home não encontrada');
    }

    const now = new Date().toISOString();
    const nextLayout = this.normalizeHomeLayout(payload.layout ?? existing.layout, now);    
    // [DEBUG B2] Log Hero APÓS normalização no backend
    const heroSection = nextLayout.sections?.find((s: any) => s.kind === 'hero' || s.cols?.some((c: any) => c.blocks?.some((b: any) => b.type === 'hero')));
    if (heroSection) {
      const heroBlock = heroSection.cols?.flatMap((c: any) => c.blocks || []).find((b: any) => b.type === 'hero');
      if (heroBlock) {
        console.log('[BACKEND B2] Hero APÓS normalização:');
        console.log('  - version:', heroBlock.data?.version);
        console.log('  - rightVariant:', heroBlock.data?.rightVariant);
        console.log('  - right blocks:', heroBlock.data?.right?.map((b: any) => b.type));
      }
    }    const updated = await repository.update(id, {
      slug: 'home',
      pageKey: 'home',
      title: payload.title ?? existing.title ?? 'P\u00e1gina Inicial',
      description: payload.description === undefined ? existing.description ?? null : payload.description ?? null,
      layout: nextLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: new Date()
    });
    await this.clearCache();
    return { page: updated, changedToDraft: false };
  }

  private async clearCache() {
    await cacheProvider.del(cacheKeys.home);
    await cacheProvider.del(cacheKeys.page('home'));
  }
}
