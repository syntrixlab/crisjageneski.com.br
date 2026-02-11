import { Prisma, Page } from '@prisma/client';
import { prisma } from '../config/prisma';

export class PageRepository {
  findById(id: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { slug } });
  }

  findByPageKey(pageKey: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { pageKey } });
  }

  findBySlugOrKey(key: string): Promise<Page | null> {
    return prisma.page.findFirst({
      where: {
        OR: [{ slug: key }, { pageKey: key }]
      }
    });
  }

  findPublishedBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findFirst({ where: { slug, status: 'published' } });
  }

  findPublishedByPageKey(pageKey: string): Promise<Page | null> {
    return prisma.page.findFirst({ where: { pageKey, status: 'published' } });
  }

  findAll(options?: { excludePageKey?: string; excludeSlug?: string }): Promise<Page[]> {
    const filters: Prisma.PageWhereInput[] = [];
    
    // Filtro para pageKey: exclui APENAS se for igual ao valor especificado (NULL é diferente)
    if (options?.excludePageKey) {
      filters.push({ 
        OR: [
          { pageKey: null },
          { pageKey: { not: options.excludePageKey } }
        ]
      });
    }
    
    // Filtro para slug: exclui se for igual ao valor especificado
    if (options?.excludeSlug) {
      filters.push({ slug: { not: options.excludeSlug } });
    }

    const where: Prisma.PageWhereInput | undefined = filters.length ? { AND: filters } : undefined;
    
    console.log('[PageRepository] findAll - options:', options);
    console.log('[PageRepository] findAll - where:', JSON.stringify(where, null, 2));
    
    return prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' } }).then(pages => {
      console.log('[PageRepository] findAll - resultado:', pages.length, 'páginas');
      console.log('[PageRepository] Páginas encontradas:', pages.map(p => ({ 
        id: p.id, 
        title: p.title, 
        slug: p.slug, 
        pageKey: p.pageKey 
      })));
      return pages;
    });
  }

  create(data: Prisma.PageCreateInput): Promise<Page> {
    return prisma.page.create({ data });
  }

  update(id: string, data: Prisma.PageUpdateInput): Promise<Page> {
    return prisma.page.update({ where: { id }, data });
  }

  delete(id: string): Promise<Page> {
    return prisma.page.delete({ where: { id } });
  }
}
