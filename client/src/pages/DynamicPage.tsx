import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPage } from '../api/queries';
import { SeoHead } from '../components/SeoHead';
import { PageRenderer } from '../components/PageRenderer';

export function DynamicPage() {
  const { slug = '' } = useParams();
  if (slug === 'home') return <Navigate to="/" replace />;
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug),
    enabled: !!slug && slug !== 'home'
  });

  if (isLoading) return <div className="container" style={{ padding: '2rem 0' }}>Carregando...</div>;
  if (isError || !page) return <div className="container" style={{ padding: '2rem 0' }}>Página não encontrada.</div>;

  return (
    <section className="section-block">
      <div className="container" style={{ display: 'grid', gap: '1.25rem' }}>
        <SeoHead title={page.title} description={page.description ?? page.title} />
        <div className="section-title">
          <h1 style={{ margin: 0 }}>{page.title}</h1>
          {page.description && <p>{page.description}</p>}
        </div>
        <PageRenderer layout={page.layout} pageSlug={page.slug || slug} />
      </div>
    </section>
  );
}
