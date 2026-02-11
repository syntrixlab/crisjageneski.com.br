import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArticle, incrementArticleView } from '../api/queries';
import { SeoHead } from '../components/SeoHead';
import { RichText } from '../components/RichText';

export function ArticlePage() {
  const { slug = '' } = useParams();
  const { data: article } = useQuery({ queryKey: ['article', slug], queryFn: () => fetchArticle(slug) });
  const [viewCount, setViewCount] = useState<number | null>(null);
  const hasSentViewRef = useRef(false);

  useEffect(() => {
    if (article?.views !== undefined) {
      setViewCount(article.views);
    }
  }, [article?.id, article?.views]);

  // Incrementa view sempre que o artigo carregar (sem usar sessionStorage)
  useEffect(() => {
    if (!article?.id) return;
    if (hasSentViewRef.current) return;
    hasSentViewRef.current = true;

    incrementArticleView(article.id)
      .then((views) => setViewCount((prev) => Math.max(prev ?? 0, views)))
      .catch(() => null);

    return () => {
      hasSentViewRef.current = false;
    };
  }, [article?.id]);

  // Incrementa view quando restaurar do BFCache (voltar/avançar no navegador)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return; // Evita dupla contagem no load normal
      if (!article?.id) return;
      incrementArticleView(article.id)
        .then((views) => setViewCount((prev) => Math.max(prev ?? 0, views)))
        .catch(() => null);
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [article?.id]);

  if (!article) return <div className="container" style={{ padding: '2rem 0' }}>Carregando...</div>;

  const formattedDate = article.publishedAt
    ? (() => {
        const date = new Date(article.publishedAt);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      })()
    : null;

  return (
    <section className="section-block">
      <div className="container" style={{ display: 'grid', gap: '1.5rem' }}>
        <SeoHead title={article.title} description={article.excerpt} />
        <div className="section-title">
          <h1 style={{ margin: 0 }}>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {formattedDate && <span>Publicado em {formattedDate}</span>}
            {viewCount !== null && <span>{viewCount.toLocaleString('pt-BR')} visualizações</span>}
            <span>Leitura leve e aplicada</span>
          </div>
        </div>
        <article className="card" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
          <RichText html={article.content} />
        </article>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <a className="link" href="/blog">
            Voltar para o blog
          </a>
          <a className="btn btn-primary" href="/contato">
            Conversar sobre este tema
          </a>
        </div>
      </div>
    </section>
  );
}
