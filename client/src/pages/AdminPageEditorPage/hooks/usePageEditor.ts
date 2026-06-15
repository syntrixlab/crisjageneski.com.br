import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ensureLayoutV2 } from '@/utils/pageLayoutHelpers';
import { ensureHeroInSection } from '@/utils/heroMigration';
import {
  createPage,
  fetchAdminPage,
  publishPage,
  unpublishPage,
  updatePage,
  fetchAdminHomePage
} from '@/api/queries';
import type { Page, PageLayoutV2, PageStatus } from '@/types';

export type PageForm = {
  id?: string;
  title: string;
  slug: string;
  pageKey?: string | null;
  description?: string | null;
  layout: PageLayoutV2;
  status: PageStatus;
  publishedAt?: string | null;
};

const emptyLayout: PageLayoutV2 = { version: 2, sections: [] };

const emptyPage: PageForm = {
  title: '',
  slug: '',
  pageKey: null,
  description: '',
  layout: emptyLayout,
  status: 'draft'
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const validatePage = (current: PageForm, isHomePage: boolean): string | null => {
  if (!current.title.trim() || current.title.trim().length < 3)
    return 'Informe um titulo com ao menos 3 caracteres.';
  if (!isHomePage && (!current.slug.trim() || current.slug.trim().length < 2))
    return 'Informe um slug para a pagina.';
  return null;
};

export function usePageEditor(id: string | undefined, pageKey?: string) {
  const isHomePage = pageKey === 'home';
  const isNew = !isHomePage && (!id || id === 'new');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    data: existingPage,
    isLoading: isLoadingPage,
    isError: isPageError,
    refetch: refetchPage
  } = useQuery<Page>({
    queryKey: isHomePage ? ['admin', 'page', 'home'] : ['admin', 'page', id],
    queryFn: () => (isHomePage ? fetchAdminHomePage() : fetchAdminPage(id || '')),
    enabled: isHomePage ? true : !isNew && !!id
  });

  const [page, setPage] = useState<PageForm>(emptyPage);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);

  useEffect(() => {
    if (existingPage) {
      const normalizedLayout = ensureLayoutV2(existingPage.layout);
      let finalLayout = normalizedLayout;
      if (isHomePage && normalizedLayout.sections.length > 0) {
        const firstSection = normalizedLayout.sections[0];
        const hasHero = firstSection.cols?.some((col) =>
          col.blocks?.some((block) => block.type === 'hero')
        );
        if (!hasHero) {
          const sectionWithHero = ensureHeroInSection(firstSection);
          finalLayout = {
            ...normalizedLayout,
            sections: [sectionWithHero, ...normalizedLayout.sections.slice(1)]
          };
        }
      }
      setPage({
        id: existingPage.id,
        title: existingPage.title,
        slug: isHomePage ? 'home' : existingPage.slug,
        pageKey: existingPage.pageKey ?? (isHomePage ? 'home' : null),
        description: existingPage.description ?? '',
        layout: finalLayout,
        status: isHomePage ? 'published' : existingPage.status ?? 'draft',
        publishedAt: existingPage.publishedAt ?? null
      });
    }
  }, [existingPage?.id, isHomePage]);

  const createMutation = useMutation({
    mutationFn: (payload: PageForm) => createPage(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setPage({
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description ?? '',
        layout: ensureLayoutV2(data.layout),
        status: data.status ?? 'draft',
        publishedAt: data.publishedAt ?? null
      });
      navigate(`/admin/pages/${data.id}/edit`, { replace: true });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setFormError(msg ?? 'Falha ao salvar página.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PageForm }) => updatePage(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setPage((prev) => ({
        ...prev,
        ...data.page,
        layout: ensureLayoutV2(data.page.layout),
        status: data.page.status ?? 'draft'
      }));
      if (data.changedToDraft) {
        setDraftAlert('Esta página voltou para rascunho. Publique novamente para atualizar no site.');
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setFormError(msg ?? 'Falha ao atualizar página.');
    }
  });

  const publishMutation = useMutation({
    mutationFn: publishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
      setPage((prev) => ({
        ...prev,
        ...data,
        layout: ensureLayoutV2(data.layout),
        status: data.status ?? 'published'
      }));
      setDraftAlert(null);
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setPage((prev) => ({
        ...prev,
        ...data,
        layout: ensureLayoutV2(data.layout),
        status: 'draft'
      }));
    }
  });

  const busyMutations =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending;

  const saveDraft = async (): Promise<{ id: string } | null> => {
    const error = validatePage(page, isHomePage);
    if (error) {
      setFormError(error);
      return null;
    }
    setFormError(null);
    const payload: PageForm = {
      ...page,
      slug: isHomePage ? 'home' : slugify(page.slug),
      pageKey: isHomePage ? 'home' : page.pageKey ?? null,
      status: isHomePage ? 'published' : 'draft',
      layout: ensureLayoutV2(page.layout)
    };
    if (isHomePage) {
      if (!page.id) {
        setFormError('Home não carregada. Tente novamente.');
        return null;
      }
      const updated = await updateMutation.mutateAsync({ id: page.id, payload });
      return updated.page;
    }
    if (isNew || !page.id) {
      return createMutation.mutateAsync(payload);
    }
    const updated = await updateMutation.mutateAsync({ id: page.id, payload });
    return updated.page;
  };

  const publish = (pageId: string) => publishMutation.mutateAsync(pageId);

  const handleMoveToDraft = () => {
    if (!page.id || isHomePage) return;
    unpublishMutation.mutate(page.id);
  };

  return {
    page,
    setPage,
    viewMode,
    setViewMode,
    formError,
    draftAlert,
    busyMutations,
    isNew,
    isHomePage,
    isLoadingPage,
    isPageError,
    refetchPage,
    saveDraft,
    publish,
    handleMoveToDraft
  };
}
