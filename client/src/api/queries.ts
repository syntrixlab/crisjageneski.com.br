import { api } from './client';
import type { Article, Media, NavbarItem, Page, SiteSettings, User } from '../types';

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const fetchNavbar = async (): Promise<NavbarItem[]> => {
  const { data } = await api.get('/public/navigation-items');
  return data.data;
};

export const fetchHomePage = async (): Promise<Page> => {
  const { data } = await api.get('/public/pages/home');
  return data.data;
};

export const fetchPage = async (slug: string): Promise<Page> => {
  const { data } = await api.get(`/public/pages/${slug}`);
  return data.data;
};

export const fetchArticles = async (filters?: {
  search?: string;
  page?: number;
  limit?: number;
  excludeIds?: string[];
}): Promise<PaginatedResponse<Article>> => {
  const { data } = await api.get('/public/blog/posts', {
    params: {
      search: filters?.search,
      page: filters?.page,
      limit: filters?.limit,
      excludeIds: filters?.excludeIds?.length ? filters.excludeIds.join(',') : undefined
    }
  });
  return data.data;
};

export const fetchFeaturedArticles = async (limit = 3): Promise<Article[]> => {
  const { data } = await api.get('/public/blog/featured', { params: { limit } });
  return data.data;
};

export const fetchMostViewedArticles = async (params?: { limit?: number; excludeIds?: string[] }): Promise<Article[]> => {
  const { data } = await api.get('/public/blog/most-viewed', {
    params: {
      limit: params?.limit,
      excludeIds: params?.excludeIds?.length ? params.excludeIds.join(',') : undefined
    }
  });
  return data.data;
};

export const fetchArticle = async (slug: string): Promise<Article> => {
  const { data } = await api.get(`/public/blog/${slug}`);
  return data.data;
};

export type BlogHomeData = {
  featured: Article[];
  mostViewed: Article[];
  latest: PaginatedResponse<Article>;
};

export const fetchBlogHome = async (): Promise<BlogHomeData> => {
  const { data } = await api.get('/public/blog/home');
  return data.data;
};

export const incrementArticleView = async (id: string): Promise<number> => {
  const { data } = await api.post(`/public/blog/posts/${id}/view`, {}, {
    headers: {
      'Cache-Control': 'no-store'
    },
    // keepalive permite o request completar mesmo se o usuário sair da página
    // @ts-ignore - axios não tem tipagem para keepalive mas o fetch subjacente suporta
    keepalive: true
  });
  return data.data?.views ?? 0;
};

export const login = async (email: string, password: string): Promise<{ user: User }> => {
  const { data } = await api.post('/login', { email, password });
  return data.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/logout');
};

export const fetchCurrentUser = async (): Promise<User> => {
  const { data } = await api.get('/admin/me');
  return data.data;
};

// Admin
export const fetchAdminNavbar = async (): Promise<NavbarItem[]> => {
  const { data } = await api.get('/navigation-items');
  return data.data;
};

export const createNavbarItem = async (payload: Partial<NavbarItem>) => {
  const { data } = await api.post('/navigation-items', payload);
  return data.data;
};

export const updateNavbarItem = async (id: string, payload: Partial<NavbarItem>) => {
  const { data } = await api.patch(`/navigation-items/${id}`, payload);
  return data.data;
};

export const deleteNavbarItem = async (id: string) => api.delete(`/navigation-items/${id}`);

export const reorderNavbarItems = async (
  context: 'navbar' | 'footer',
  items: { id: string; parentId?: string | null; order: number }[]
) => {
  const { data } = await api.patch('/navigation-items/reorder', { context, items });
  return data.data as NavbarItem[];
};


export const ensureHomePage = async (): Promise<{ pageId: string; pageKey?: string | null }> => {
  const { data } = await api.post('/admin/pages/ensure-home');
  return data.data;
};

export const fetchAdminHomePage = async (): Promise<Page> => {
  const { data } = await api.get('/admin/home');
  return data.data;
};

export const fetchAdminPages = async (): Promise<Page[]> => {
  const { data } = await api.get('/admin/pages');
  return data.data;
};

export const fetchAdminPage = async (id: string): Promise<Page> => {
  const { data } = await api.get(`/admin/pages/${id}`);
  return data.data;
};

export const createPage = async (payload: Partial<Page>) => {
  const { data } = await api.post('/admin/pages', payload);
  return data.data;
};

export const updatePage = async (id: string, payload: Partial<Page>) => {
  const { data } = await api.put(`/admin/pages/${id}`, payload);
  return data.data as { page: Page; changedToDraft?: boolean };
};

export const deletePage = async (id: string) => api.delete(`/admin/pages/${id}`);

export const publishPage = async (id: string): Promise<Page> => {
  const { data } = await api.post(`/admin/pages/${id}/publish`);
  return data.data;
};

export const unpublishPage = async (id: string): Promise<Page> => {
  const { data } = await api.post(`/admin/pages/${id}/unpublish`);
  return data.data;
};

export const fetchAdminArticles = async (): Promise<Article[]> => {
  const { data } = await api.get('/admin/posts');
  return data.data;
};

export const createArticle = async (payload: Partial<Article>) => {
  const { data } = await api.post('/admin/posts', payload);
  return data.data;
};

export const updateArticle = async (id: string, payload: Partial<Article>) => {
  const { data } = await api.put(`/admin/posts/${id}`, payload);
  return data.data as { post: Article; changedToDraft?: boolean };
};

export const deleteArticle = async (id: string) => api.delete(`/admin/posts/${id}`);

export const publishArticle = async (id: string) => {
  const { data } = await api.patch(`/admin/posts/${id}/publish`);
  return data.data as Article;
};

export const unpublishArticle = async (id: string) => {
  const { data } = await api.patch(`/admin/posts/${id}/unpublish`);
  return data.data as Article;
};

export const fetchMedia = async (opts?: { search?: string; tag?: string }): Promise<Media[]> => {
  const params = new URLSearchParams();
  if (opts?.search) params.set('search', opts.search);
  if (opts?.tag) params.set('tag', opts.tag);
  const { data } = await api.get(`/admin/media${params.toString() ? '?' + params : ''}`);
  return data.data;
};

export type MediaUploadPayload = {
  file: File;
  alt?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

export const uploadMedia = async (payload: MediaUploadPayload) => {
  const form = new FormData();
  form.append('file', payload.file);
  if (payload.alt) form.append('alt', payload.alt);
  if (payload.title) form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  if (payload.tags?.length) payload.tags.forEach((t) => form.append('tags', t));
  const { data } = await api.post('/admin/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data as { mediaId: string; url: string; width?: number; height?: number; alt?: string | null };
};

export const updateMedia = async (id: string, payload: Partial<Media> & { file?: File | null }) => {
  const form = new FormData();
  if (payload.file instanceof File) form.append('file', payload.file);
  if (payload.alt !== undefined) form.append('alt', payload.alt ?? '');
  if (payload.title !== undefined) form.append('title', payload.title ?? '');
  if (payload.description !== undefined) form.append('description', payload.description ?? '');
  if (payload.tags !== undefined) {
    if (payload.tags.length === 0) form.append('tags', '');
    else payload.tags.forEach((t) => form.append('tags', t));
  }
  const { data } = await api.put(`/admin/media/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
};

export const saveCropData = async (id: string, cropData: {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  cropRatio?: string;
}) => {
  const { data } = await api.put(`/admin/media/${id}/crop`, cropData);
  return data.data;
};

export const deleteMedia = async (id: string) => api.delete(`/admin/media/${id}`);

// Site settings (public)
// Agora usa o mesmo endpoint cacheado que fetchTheme
// para evitar requisições múltiplas e aproveitar Redis cache
export const fetchSiteSettings = async (): Promise<SiteSettings> => {
  const { data } = await api.get('/public/theme');
  return data.data;
};

// Fetch complete site config (optimized, Redis-cached)
// Retorna toda SiteSettings: tema, branding, sociais, WhatsApp, etc
// 10-100x mais rápido que banco de dados
export const fetchTheme = async () => {
  const { data } = await api.get('/public/theme');
  return data.data;
};

export const fetchAdminSiteSettings = async (): Promise<SiteSettings> => {
  const { data } = await api.get('/admin/site-settings');
  return data.data;
};

export const updateSiteSettings = async (payload: SiteSettings) => {
  const { data } = await api.patch('/admin/site-settings', payload);
  return data.data as SiteSettings;
};

// ========== Form Submissions ==========

export interface SubmitFormInput {
  pageSlug: string;
  formBlockId: string;
  formData: Record<string, any>;
  honeypot?: string;
}

export interface SubmitFormResponse {
  success: boolean;
  submissionId?: string;
}

export interface FormSubmission {
  id: string;
  pageId: string;
  formBlockId: string;
  data: Record<string, any>;
  summary: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  leadName?: string | null;
  leadMessage?: string | null;
  leadPhone?: string | null;
  leadPhoneNormalized?: string | null;
  resolvedFields?: Array<{ id: string; label?: string | null; value: any; type?: string | null }>;
  page?: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface FormSubmissionsResponse {
  submissions: FormSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchFormSubmissionsParams {
  pageId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Submit a form from the public website
 * Used in PageRenderer.tsx FormRenderer component
 */
export const submitForm = async (input: SubmitFormInput): Promise<SubmitFormResponse> => {
  try {
    if (!input.pageSlug || typeof input.pageSlug !== 'string') {
      throw new Error('pageSlug Ã© obrigatÃ³rio.');
    }
    if (typeof input.formData !== 'object' || Array.isArray(input.formData)) {
      throw new Error('formData precisa ser um objeto.');
    }
    const { data } = await api.post('/public/forms/submit', {
      pageSlug: input.pageSlug,
      formBlockId: input.formBlockId,
      formData: input.formData,
      honeypot: input.honeypot
    });
    return data.data || { success: true };
  } catch (error: any) {
    // Extract user-friendly error message
    const message = error?.response?.data?.message || error?.message || 'Erro ao enviar formulário. Tente novamente.';
    throw new Error(message);
  }
};

/**
 * Fetch paginated list of form submissions (Admin only)
 * Used in AdminFormSubmissionsPage.tsx
 */
export const fetchFormSubmissions = async (params?: FetchFormSubmissionsParams): Promise<FormSubmissionsResponse> => {
  const queryParams: Record<string, string> = {};
  
  if (params?.pageId) queryParams.pageId = params.pageId;
  if (params?.search) queryParams.search = params.search;
  if (params?.startDate) queryParams.startDate = params.startDate;
  if (params?.endDate) queryParams.endDate = params.endDate;
  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();

  const { data } = await api.get('/admin/form-submissions', { params: queryParams });
  return data.data;
};

/**
 * Fetch a single form submission by ID (Admin only)
 * Used in AdminFormSubmissionDetailPage.tsx
 */
export const fetchFormSubmission = async (id: string): Promise<FormSubmission> => {
  const { data } = await api.get(`/admin/form-submissions/${id}`);
  return data.data;
};

/**
 * Delete a form submission by ID (Admin only)
 * Used in AdminFormSubmissionsPage.tsx and AdminFormSubmissionDetailPage.tsx
 */
export const deleteFormSubmission = async (id: string): Promise<void> => {
  await api.delete(`/admin/form-submissions/${id}`);
};

// Analytics/Metrics
export interface DashboardMetrics {
  pagesPublished: number;
  pagesDraft: number;
  articlesPublished: number;
  articlesDraft: number;
  totalArticleViews: number;
  totalImages: number;
  totalArticles: number;
  totalPages: number;
}

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await api.get('/admin/metrics');
  return data.data;
};
