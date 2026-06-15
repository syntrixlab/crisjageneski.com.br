import type { Media, SocialLink } from './auth';
import type { Page } from './layout';

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt?: string | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  views: number;
  createdAt?: string;
  updatedAt?: string;
  coverMediaId?: string | null;
  coverMedia?: Media | null;
  coverImageUrl?: string | null;
  coverAlt?: string | null;
  coverCrop?: Record<string, unknown> | null;
  coverOriginalUrl?: string | null;
};

export type SiteSettings = {
  siteName: string;
  cnpj?: string | null;
  crp?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  socials: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
};

export type FormSubmission = {
  id: string;
  pageId: string;
  formBlockId: string;
  data: Record<string, unknown>;
  summary?: Record<string, unknown> | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: Page;
};
