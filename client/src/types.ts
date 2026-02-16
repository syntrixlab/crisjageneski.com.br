export type NavigationItemType = 'INTERNAL_PAGE' | 'EXTERNAL_URL';

export type NavbarItem = {
  id: string;
  label: string;
  type: NavigationItemType;
  pageKey?: string | null;
  url?: string | null;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId?: string | null;
  orderNavbar: number;
  orderFooter?: number | null;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeSection = {
  id: string;
  type: string;
  title?: string | null;
  data: Record<string, unknown>;
  order: number;
  visible: boolean;
  isLocked?: boolean;
};

export type PageStatus = 'draft' | 'published';

export type TextBlockData = {
  contentHtml: string;
  width?: 'normal' | 'wide';
  background?: 'none' | 'soft';
};

export type ImageBlockData = {
  mediaId?: string | null;
  src: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  size?: 25 | 50 | 75 | 100;
  align?: 'left' | 'center' | 'right';
  // Crop settings for this specific usage
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free';
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number;
  // Height percentage for Hero images (0-100, default 100)
  heightPct?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
};

export type ButtonBlockData = {
  label: string;
  href: string;
  newTab?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string | null;
  linkMode?: 'page' | 'manual';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type CardItem = {
  id: string;
  icon?: string | null;
  iconType?: 'emoji' | 'image' | null;
  iconImageUrl?: string | null;
  iconImageId?: string | null;
  iconAlt?: string | null;
  title: string;
  text: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export type CardBlockData = {
  title?: string | null;
  subtitle?: string | null;
  items: CardItem[];
  layout: 'auto' | '2' | '3' | '4';
  variant: 'feature' | 'simple' | 'borderless';
};

export type FormField = {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null; // For select type
};

export type FormBlockData = {
  title?: string | null;
  description?: string | null;
  fields: FormField[];
  submitLabel?: string;
  successMessage?: string;
  storeSummaryKeys?: string[];
};

export type HeroMediaMode = 'single_image' | 'cards_only' | 'four_cards';

export type HeroImage = {
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
  focal?: { x: number; y: number; zoom: number } | null;
};

export type HeroCard = {
  title: string;
  text: string;
  icon?: string | null;
  imageId?: string | null;
  url?: string | null;
  alt?: string | null;
};

export type HeroFourCards = {
  medium: HeroCard;
  small: HeroCard[]; // length 3
};

// Legacy Hero (V1) - mantido para compatibilidade
export type HeroBlockDataV1 = {
  heading?: string | null;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  secondaryCta?: string | null;
  secondaryHref?: string | null;
  secondaryLinkMode?: 'page' | 'manual' | null;
  secondaryPageKey?: string | null;
  secondaryPageId?: string | null;
  secondarySlug?: string | null;
  badges?: string[] | null;
  mediaMode?: HeroMediaMode | null;
  singleImage?: HeroImage | null;
  singleCard?: { quote?: string | null; author?: string | null } | null;
  fourCards?: HeroFourCards | null;
};

// Novos tipos de blocos

export type PillItem = {
  text: string;
  href?: string | null;
  linkMode?: 'manual' | 'article' | null;
  articleSlug?: string | null;
};

export type PillsBlockData = {
  pills?: (string | PillItem)[];
  items?: string[]; // Legacy field for compatibility
  size?: 'xs' | 'sm' | 'md';
  variant?: 'neutral' | 'primary' | 'accent';
};

export type SpanBlockData = {
  kind: 'accent-bar' | 'muted-text';
  text?: string | null;
};

export type ButtonGroupButton = {
  id?: string;
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  linkMode?: 'manual' | 'page';
  pageKey?: string | null;
  pageId?: string | null;
  slug?: string | null;
};

export type ButtonGroupBlockData = {
  buttons: ButtonGroupButton[];
  align?: 'start' | 'center';
  stackOnMobile?: boolean;
};

// Recent Posts Section - Seção de artigos recentes
export type RecentPostsBlockData = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaLinkMode?: 'page' | 'manual';
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  postsLimit?: number;
};

// Social Links Block - Renderiza redes sociais dinamicamente de SiteSettings
export type SocialLinksBlockData = {
  title?: string | null;
  variant?: 'list' | 'chips' | 'buttons';
  showIcons?: boolean;
  columns?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
};

// WhatsApp CTA Block - Usa whatsappLink/Message de SiteSettings
export type WhatsAppCtaBlockData = {
  label?: string;
  style?: 'primary' | 'secondary';
  openInNewTab?: boolean;
  hideWhenDisabled?: boolean;
};

export type ServicesBlockItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  // Campos opcionais para suportar LinkPicker
  linkMode?: 'page' | 'manual';
  pageId?: string | null;
  pageKey?: string | null;
  slug?: string | null;
};

export type ServicesBlockData = {
  sectionTitle: string;
  items: ServicesBlockItem[];
  buttonLabel?: string;
};

export type CtaBlockData = {
  title?: string | null;
  text?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaLinkMode?: 'page' | 'manual' | null;
  ctaPageKey?: string | null;
  ctaPageId?: string | null;
  ctaSlug?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type MediaTextBlockData = {
  contentHtml: string;
  imageId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSide?: 'left' | 'right';
  imageWidth?: 25 | 50 | 75 | 100;
  imageHeight?: 25 | 50 | 75 | 100;
};

export type ContactInfoBlockData = {
  titleHtml: string;
  descriptionHtml?: string;
  whatsappLabel: string;
  whatsappVariant: 'primary' | 'secondary' | 'tertiary';
  socialLinksTitle: string;
  socialLinksVariant: 'list' | 'icons';
};

// Hero V2 - Bloco composto
export type HeroLayoutVariant = 'split' | 'stacked';
export type HeroImageHeight = 'sm' | 'md' | 'lg' | 'xl' | number;

export type HeroBlockDataV2 = {
  version: 2;
  layout: 'two-col';
  layoutVariant?: HeroLayoutVariant;
  imageHeight?: HeroImageHeight | null;
  left: PageBlock[];
  right: PageBlock[];
  rightVariant: 'image-only' | 'cards-only' | 'cards-with-image';
};

export type HeroBlockData = HeroBlockDataV1 | HeroBlockDataV2;

export type PageBlock =
  | {
      id: string;
      type: 'text';
      colSpan?: number;
      rowIndex?: number;
      data: TextBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'image';
      colSpan?: number;
      rowIndex?: number;
      data: ImageBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'button';
      colSpan?: number;
      rowIndex?: number;
      data: ButtonBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'cards';
      colSpan?: number;
      rowIndex?: number;
      data: CardBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'form';
      colSpan?: number;
      rowIndex?: number;
      data: FormBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'hero';
      colSpan?: number;
      rowIndex?: number;
      data: HeroBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'pills';
      colSpan?: number;
      rowIndex?: number;
      data: PillsBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'span';
      colSpan?: number;
      rowIndex?: number;
      data: SpanBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'buttonGroup';
      colSpan?: number;
      rowIndex?: number;
      data: ButtonGroupBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'recent-posts';
      colSpan?: number;
      rowIndex?: number;
      data: RecentPostsBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'social-links';
      colSpan?: number;
      rowIndex?: number;
      data: SocialLinksBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'whatsapp-cta';
      colSpan?: number;
      rowIndex?: number;
      data: WhatsAppCtaBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'contact-info';
      colSpan?: number;
      rowIndex?: number;
      data: ContactInfoBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'services';
      colSpan?: number;
      rowIndex?: number;
      data: ServicesBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'cta';
      colSpan?: number;
      rowIndex?: number;
      data: CtaBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      id: string;
      type: 'media-text';
      colSpan?: number;
      rowIndex?: number;
      data: MediaTextBlockData;
      isLocked?: boolean;
      visible?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };

// V1 Layout (legacy, column-based)
export type PageLayoutV1 = {
  version: 1;
  columns: 1 | 2 | 3;
  cols: Array<{ id?: string; blocks: PageBlock[] }>;
};

// V2 Layout (section-based)
export type PageSection = {
  id: string;
  kind?: 'normal' | 'hero'; // Hero é uma seção especial
  columns: 1 | 2 | 3;
  columnsLayout?: 2 | 3; // preferred layout selector; falls back to columns
  cols: Array<{ id: string; blocks: PageBlock[] }>;
  settings?: {
    background?: 'none' | 'soft' | 'dark';
    backgroundStyle?: 'none' | 'soft' | 'dark';
    padding?: 'normal' | 'compact' | 'large';
    density?: 'compact' | 'normal' | 'large';
    height?: 'normal' | 'tall';
    maxWidth?: 'normal' | 'wide';
    width?: 'normal' | 'wide';
    columnsLayout?: 2 | 3;
  };
};

export type PageLayoutV2 = {
  version: 2;
  sections: PageSection[];
};

export type PageLayout = PageLayoutV1 | PageLayoutV2;

export type Page = {
  id: string;
  slug: string;
  pageKey?: string | null;
  title: string;
  description?: string | null;
  layout: PageLayout;
  status: PageStatus;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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

export type Media = {
  id: string;
  url: string;
  path?: string;
  bucket?: string;
  alt?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  // Crop data
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free' | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type SocialLink = {
  id: string;
  platform:
    | 'instagram'
    | 'whatsapp'
    | 'facebook'
    | 'linkedin'
    | 'youtube'
    | 'tiktok'
    | 'x'
    | 'site'
    | 'email'
    | 'telefone'
    | 'custom';
  label?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
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
  data: Record<string, any>;
  summary?: Record<string, any> | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: Page;
};
