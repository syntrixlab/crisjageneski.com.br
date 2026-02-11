import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { ArticleStatusBadge, ConfirmModal, IconButton } from '../components/AdminUI';
import { deletePage, fetchAdminPages, publishPage, unpublishPage, createPage } from '../api/queries';
import { TemplateSelectModal } from '../components/TemplateSelectModal';
import { generatePageDataFromTemplate } from '../utils/pageTemplates';
import type { Page } from '../types';

export function AdminPagesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: pages, isLoading, error, isError } = useQuery<Page[]>({ 
    queryKey: ['admin', 'pages'], 
    queryFn: fetchAdminPages,
    retry: 1
  });
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // [DEBUG] Log de estado da query
  console.log('[AdminPagesPage] Query state:', { isLoading, error, isError, pagesCount: pages?.length, pages });

  const publishMutation = useMutation({
    mutationFn: publishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setDeleteTarget(null);
    }
  });

  const createMutation = useMutation({
    mutationFn: createPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setShowTemplateModal(false);
      navigate(`/admin/pages/${data.id}/edit`);
    },
    onError: (error: any) => {
      console.error('Create page error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error object:', error);
    }
  });

  const getSortTime = (page: Page) => {
    const value = page.updatedAt ?? page.publishedAt ?? page.createdAt ?? '';
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const filteredPages = useMemo(() => {
    console.log('[FRONTEND] Pages recebidas:', pages);
    const filtered = (pages ?? []).filter((p) => p.pageKey !== 'home' && p.slug !== 'home');
    console.log('[FRONTEND] Pages após filtro (removendo home):', filtered);
    console.log('[FRONTEND] Pages filtradas:', filtered.map(p => ({ id: p.id, title: p.title, slug: p.slug, pageKey: p.pageKey })));
    return filtered;
  }, [pages]);
  const sortedPages = useMemo(() => [...filteredPages].sort((a, b) => getSortTime(b) - getSortTime(a)), [filteredPages]);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const handleTemplateSelect = (templateId: string) => {
    const pageData = generatePageDataFromTemplate(templateId);
    console.log('Creating page with data:', pageData);
    createMutation.mutate(pageData);
  };

  return (
    <div className="admin-page">
      <SeoHead title="Páginas" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Páginas</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Gerencie páginas estáticas do site.</p>
      </div>
      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={() => setShowTemplateModal(true)}>
          Nova página
        </button>
      </div>

      <div className="admin-card admin-table">
        {isError && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            <strong>Erro ao carregar páginas:</strong>
            <p>{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
            <p style={{ fontSize: '0.875rem', color: '#666' }}>Verifique o console para mais detalhes</p>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Atualizado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando páginas...
                </td>
              </tr>
            )}
            {!isLoading && !isError && sortedPages.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-forest)' }}>
                  Nenhuma página encontrada. 
                  {pages && pages.length > 0 && ` (${pages.length} páginas foram filtradas - verifique console para debug)`}
                </td>
              </tr>
            )}
            {!isLoading && !isError && sortedPages.map((page) => (
              <tr key={page.id}>
                <td>{page.title}</td>
                <td>
                  <code>/p/{page.slug}</code>
                </td>
                <td>
                  <ArticleStatusBadge status={page.status} />
                </td>
                <td>{formatDate(page.updatedAt ?? page.createdAt)}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <IconButton icon="edit" label="Editar" tone="info" onClick={() => navigate(`/admin/pages/${page.id}/edit`)} />
                    {page.status === 'draft' ? (
                      <IconButton
                        icon="publish"
                        label="Publicar"
                        tone="info"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(page.id)}
                      />
                    ) : (
                      <IconButton
                        icon="unpublish"
                        label="Mover para rascunho"
                        tone="default"
                        disabled={unpublishMutation.isPending}
                        onClick={() => unpublishMutation.mutate(page.id)}
                      />
                    )}
                    <IconButton icon="trash" label="Remover" tone="danger" onClick={() => setDeleteTarget(page)} />
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && sortedPages.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">Nenhuma página cadastrada ainda.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isLoading && <div className="admin-empty">Carregando páginas...</div>}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover página"
        description={`Deseja remover "${deleteTarget?.title}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />

      <TemplateSelectModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
        loading={createMutation.isPending}
      />
    </div>
  );
}
