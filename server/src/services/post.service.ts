import { PostStatus } from '@prisma/client';
import { cacheKeys, cacheProvider } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PostFilters, PostRepository, PostWithMedia } from '../repositories/post.repository';
import { sanitizeContent } from '../utils/sanitize';

const repository = new PostRepository();

export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverMediaId?: string | null;
  status?: PostStatus;
  publishedAt?: Date | null;
  tags?: string[];
  isFeatured?: boolean;
};

export class PostService {
  async listPublic(filters?: { search?: string }): Promise<PostWithMedia[]> {
    return repository.listPublished(filters);
  }

  async getPublicBySlug(slug: string): Promise<PostWithMedia> {
    const post = await repository.findPublishedBySlug(slug);
    if (!post) throw new HttpError(404, 'Post not found');
    return post;
  }

  async listPaginated(filters?: PostFilters) {
    return repository.paginatePublished(filters);
  }

  async listFeatured(limit = 3) {
    return repository.listFeatured(limit);
  }

  async listMostViewed(limit = 3, excludeIds?: string[]) {
    return repository.listMostViewed(limit, excludeIds);
  }

  async getBlogHome() {
    // 1. Buscar posts em destaque (isFeatured=true)
    let featured = await repository.listFeatured(3);
    
    // 2. Se não houver posts em destaque, usar os 3 mais recentes
    if (featured.length === 0) {
      const recent = await repository.listPublished();
      featured = recent.slice(0, 3);
    }
    
    const featuredIds = featured.map(p => p.id);
    
    // 3. Buscar top 3 mais vistos (independente de featured)
    // O frontend remove duplicatas se necessário
    const mostViewed = await repository.listMostViewed(3, []);
    
    // 4. Buscar posts mais recentes para o feed (excluindo featured e mostViewed)
    const excludeIds = [...featuredIds, ...mostViewed.map(p => p.id)];
    const latest = await repository.paginatePublished({
      page: 1,
      limit: 6,
      excludeIds
    });
    
    return {
      featured: featured.slice(0, 3),
      mostViewed: mostViewed,
      latest
    };
  }

  async listAdmin(): Promise<PostWithMedia[]> {
    return repository.listAll();
  }

  async create(payload: PostInput): Promise<PostWithMedia> {
    const status: PostStatus = payload.status ?? PostStatus.draft;
    const publishedAt = status === PostStatus.published ? payload.publishedAt ?? new Date() : null;
    // Permitir isFeatured=true mesmo em DRAFT (só aparece no blog se status=PUBLISHED)
    const isFeatured = payload.isFeatured ?? false;

    // Validar limite apenas se isFeatured=true E status=published
    if (isFeatured && status === PostStatus.published) {
      await this.assertFeaturedLimit(isFeatured);
    }

    const created = await repository.create({
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content: sanitizeContent(payload.content),
      coverMedia: payload.coverMediaId ? { connect: { id: payload.coverMediaId } } : undefined,
      status,
      isFeatured,
      publishedAt,
      tags: payload.tags ?? []
    });

    await this.invalidateCache(created.slug);
    return created;
  }

  async update(id: string, payload: Partial<PostInput>): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');

    const statusBefore = existing.status;

    const hasRelevantChange =
      payload.title !== undefined ||
      payload.slug !== undefined ||
      payload.excerpt !== undefined ||
      payload.content !== undefined ||
      payload.coverMediaId !== undefined ||
      payload.tags !== undefined;

    const status: PostStatus =
      statusBefore === PostStatus.published && hasRelevantChange ? PostStatus.draft : payload.status ?? existing.status;

    // Preservar isFeatured independente do status (DRAFT pode ter isFeatured=true)
    const isFeatured = payload.isFeatured ?? existing.isFeatured ?? false;

    // Validar limite apenas se isFeatured=true E status=published
    if (isFeatured && status === PostStatus.published) {
      await this.assertFeaturedLimit(isFeatured, id);
    }

    const publishedAt =
      status === PostStatus.published
        ? payload.publishedAt ?? existing.publishedAt ?? new Date()
        : payload.publishedAt ?? (statusBefore === PostStatus.published && hasRelevantChange ? existing.publishedAt : null);

    const updated = await repository.update(id, {
      title: payload.title ?? undefined,
      slug: payload.slug ?? undefined,
      excerpt: payload.excerpt ?? undefined,
      content: payload.content ? sanitizeContent(payload.content) : undefined,
      coverMedia: payload.coverMediaId
        ? { connect: { id: payload.coverMediaId } }
        : payload.coverMediaId === null
          ? { disconnect: true }
          : undefined,
      status,
      isFeatured,
      publishedAt,
      tags: payload.tags ?? undefined
    });

    await this.invalidateCache(existing.slug);
    if (payload.slug && payload.slug !== existing.slug) {
      await this.invalidateCache(payload.slug);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const post = await repository.findById(id);
    if (!post) throw new HttpError(404, 'Post not found');
    await repository.delete(id);
    await this.invalidateCache(post.slug);
  }

  async publish(id: string): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');
    await this.assertFeaturedLimit(existing.isFeatured, id);
    const updated = await repository.update(id, {
      status: PostStatus.published,
      publishedAt: new Date(),
      isFeatured: existing.isFeatured ?? false
    });
    await this.invalidateCache(existing.slug);
    return updated;
  }

  async unpublish(id: string): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');
    // Preservar isFeatured ao despublicar - não resetar para false
    const updated = await repository.update(id, {
      status: PostStatus.draft,
      publishedAt: null
    });
    await this.invalidateCache(existing.slug);
    return updated;
  }

  async incrementViews(id: string) {
    const existing = await repository.findPublishedById(id);
    if (!existing) throw new HttpError(404, 'Post not found');
    const updated = await repository.incrementViews(id);
    await this.invalidateCache(existing.slug);
    return updated.views;
  }

  private async invalidateCache(slug?: string) {
    const keys = [cacheKeys.postsList, cacheKeys.postsFeatured, cacheKeys.postsMostViewed];
    if (slug) keys.push(cacheKeys.post(slug));
    await cacheProvider.del(keys);
  }

  private async assertFeaturedLimit(isFeatured: boolean, excludeId?: string) {
    if (!isFeatured) return;
    const count = await repository.countFeaturedPublished(excludeId);
    if (count >= 3) {
      throw new HttpError(
        400,
        'Você já possui 3 posts em destaque. Remova um destaque antes de adicionar outro.'
      );
    }
  }
}
