import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPage, deletePage, fetchAdminPages, publishPage, unpublishPage, updatePage } from '@/api/queries';
import type { Page } from '@/types';

export function usePages() {
  return useQuery<Page[]>({ queryKey: ['admin', 'pages'], queryFn: fetchAdminPages, retry: 1 });
}

export function useAdminPagesForSelect() {
  return useQuery<Page[]>({ queryKey: ['admin', 'pages', 'select'], queryFn: fetchAdminPages });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Page>) => createPage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
    }
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Page> }) => updatePage(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
    }
  });
}

export function usePublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
    }
  });
}

export function useUnpublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unpublishPage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['page', data.slug] });
    }
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pages'] })
  });
}
