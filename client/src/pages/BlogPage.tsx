import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleCardSkeleton } from '../components/ArticleCardSkeleton';
import { ArticleListItem } from '../components/ArticleListItem';
import { ArticleListItemSkeleton } from '../components/ArticleListItemSkeleton';
import { SeoHead } from '../components/SeoHead';
import {
  fetchArticles,
  fetchBlogHome,
  type BlogHomeData
} from '../api/queries';
import type { Article } from '../types';
import type { PaginatedResponse } from '../api/queries';

const PER_PAGE = 6;

export function BlogPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Buscar dados agregados do blog (featured, mostViewed, latest)
  const { data: blogHome, isPending: isBlogHomePending } = useQuery<BlogHomeData>({
    queryKey: ['blog-home'],
    queryFn: fetchBlogHome
  });

  const featured = blogHome?.featured ?? [];
  const mostViewed = blogHome?.mostViewed ?? [];

  // Criar sets de IDs para adicionar badges em "Todos os artigos"
  const featuredIds = useMemo(() => new Set(featured.map(a => a.id)), [featured]);
  const mostViewedIds = useMemo(() => new Set(mostViewed.map(a => a.id)), [mostViewed]);

  // SEMPRE buscar TODOS os artigos (sem excludeIds) para a seção "Todos os artigos"
  const { data: allPosts, isPending: isAllPostsPending } = useQuery<PaginatedResponse<Article>>({
    queryKey: ['articles', 'all-posts', search, page],
    queryFn: () =>
      fetchArticles({
        search: search || undefined,
        page,
        limit: PER_PAGE
        // NÃO usar excludeIds - "Todos os artigos" mostra tudo
      }),
    placeholderData: (prev) => prev
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = allPosts?.totalPages ?? 1;

  return (
    <section className="section-block">
      <div className="container">
        <SeoHead title="Blog" description="Artigos sobre saude emocional e bem-estar." />
        <div className="blog-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <h1 style={{ margin: 0 }}>Jornadas e reflexoes</h1>
            <p>Leituras rapidas, aplicaveis e cuidadosas.</p>
          </div>
          <form className="blog-search" onSubmit={handleSearch}>
            <div className="search-shell">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por titulo ou tema"
                aria-label="Buscar por titulo ou tema"
              />
              <button className="search-button" type="submit" aria-label="Filtrar artigos">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>
          </form>
        </div>

        <div className="blog-sections">
          {!search && (
            <>
              <div className="blog-section">
                <div className="section-title">
                  <h2>Em destaque</h2>
                  <p>Selecionados para aparecer primeiro no blog.</p>
                </div>
                {isBlogHomePending ? (
                  <div className="article-grid featured-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <ArticleCardSkeleton key={`skeleton-${i}`} variant="featured" />
                    ))}
                  </div>
                ) : featured.length > 0 ? (
                  <div className="article-grid featured-grid">
                    {featured.map((article) => (
                      <ArticleCard key={article.id} article={article} variant="featured" badge="Em destaque" />
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty">Nenhum post publicado ainda.</div>
                )}
              </div>

              <div className="blog-section">
                <div className="section-title">
                  <h2>Mais vistos</h2>
                  <p>O que as leitoras estao consumindo agora.</p>
                </div>
                {isBlogHomePending ? (
                  <div className="article-grid most-viewed-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <ArticleCardSkeleton key={`skeleton-${i}`} variant="default" />
                    ))}
                  </div>
                ) : mostViewed.length > 0 ? (
                  <div className="article-grid most-viewed-grid">
                    {mostViewed.map((article, index) => {
                      const rank = index + 1;
                      return (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          variant="default"
                          badge={`#${rank} Mais visto`}
                          showViews
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-empty">Sem dados de visualizações suficientes ainda.</div>
                )}
              </div>
            </>
          )}

          <div className="blog-section">
            <div className="section-title">
              <h2>Todos os artigos</h2>
              <p>Artigos mais recentes, incluindo destaques e mais vistos.</p>
            </div>
            <div className="article-list">
              {isAllPostsPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <ArticleListItemSkeleton key={`skeleton-${i}`} />
                ))
              ) : allPosts?.items?.map((article) => {
                // Gerar badges baseados nos sets de IDs
                const articleBadges: string[] = [];
                if (featuredIds.has(article.id)) articleBadges.push('Em destaque');
                if (mostViewedIds.has(article.id)) articleBadges.push('Mais visto');

                return (
                  <ArticleListItem
                    key={article.id}
                    article={article}
                    badges={articleBadges.length > 0 ? articleBadges : undefined}
                  />
                );
              })}
              {!isAllPostsPending && !allPosts?.items?.length && <div className="admin-empty">Nenhum artigo encontrado.</div>}
            </div>
            {allPosts && allPosts.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="muted">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Proxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
