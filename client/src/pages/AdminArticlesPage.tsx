import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArticleStatusBadge, ConfirmModal, IconButton } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { deleteArticle, fetchAdminArticles, publishArticle, unpublishArticle } from '../api/queries';
import type { Article } from '../types';

export function AdminArticlesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: articles } = useQuery<Article[]>({ queryKey: ['admin', 'posts'], queryFn: fetchAdminArticles });
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [publishTarget, setPublishTarget] = useState<Article | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<Article | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setDeleteTarget(null);
    }
  });

  const publishMutation = useMutation({
    mutationFn: publishArticle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setPublishTarget(null);
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishArticle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setUnpublishTarget(null);
    }
  });

  return (
    <div className="admin-page">
      <SeoHead title="Artigos" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Artigos</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Escreva, formate e publique conteudos.</p>
      </div>
      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <Link className="btn btn-primary" to="/admin/articles/new">
          Novo artigo
        </Link>
      </div>

      <div className="admin-card admin-table">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Status</th>
              <th>Acessos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {articles?.map((article) => (
              <tr key={article.id}>
                <td>{article.title}</td>
                <td>
                  <ArticleStatusBadge status={article.status} />
                </td>
                <td>{article.views ?? 0}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                    {article.status === 'published' && (
                      <IconButton
                        icon="globe"
                        label="Ver no site"
                        tone="info"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      />
                    )}
                    {article.status === 'draft' ? (
                      <IconButton icon="publish" label="Publicar" tone="info" onClick={() => setPublishTarget(article)} />
                    ) : (
                      <IconButton icon="unpublish" label="Mover para rascunho" onClick={() => setUnpublishTarget(article)} />
                    )}
                    <IconButton icon="edit" label="Editar" tone="info" onClick={() => navigate(`/admin/articles/${article.id}/edit`)} />
                    <IconButton icon="trash" label="Remover" tone="danger" onClick={() => setDeleteTarget(article)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover artigo"
        description={`Deseja remover "${deleteTarget?.title}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publicar artigo"
        description={`Publicar "${publishTarget?.title}"? Ele ficara visivel no site.`}
        onConfirm={() => publishTarget && publishMutation.mutate(publishTarget.id)}
        confirmLabel="Publicar"
        loading={publishMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!unpublishTarget}
        onClose={() => setUnpublishTarget(null)}
        title="Mover para rascunho"
        description={`Mover "${unpublishTarget?.title}" para rascunho? Saira do site ate ser publicado novamente.`}
        onConfirm={() => unpublishTarget && unpublishMutation.mutate(unpublishTarget.id)}
        confirmLabel="Mover"
        loading={unpublishMutation.isPending}
      />
    </div>
  );
}
