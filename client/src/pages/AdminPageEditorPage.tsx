import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ArticleStatusBadge, ConfirmModal, IconButton, Modal, Switch } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { PageBlockView, PageRendererCore } from '../components/PageRenderer';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImagePickerModal } from '../components/ImagePickerModal';
import type { CropRatio } from '../components/FlexibleImageCropModal';
import { usePageValidation } from '../hooks/usePageValidation';
import { ValidationErrorsModal, ValidationInput, CharCounter } from '../components/ValidationComponents';
import { LinkPicker, type LinkPickerValue } from '../components/LinkPicker';
import { RecentPostsBlockForm } from '../components/RecentPostsBlockForm';
import { ServicesBlockForm } from '../components/ServicesBlockForm';
import { ContactInfoBlockForm } from '../components/ContactInfoBlockForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import {
  createPage,
  fetchAdminPage,
  publishPage,
  unpublishPage,
  updatePage,
  fetchAdminHomePage
} from '../api/queries';
import type {
  ButtonBlockData,
  CardItem,
  CardBlockData,
  CtaBlockData,
  MediaTextBlockData,
  FormBlockData,
  ImageBlockData,
  HeroMediaMode,
  HeroCard,
  HeroBlockData,
  ServicesBlockData,
  Page,
  PageBlock,
  PageLayoutV2,
  PageSection,
  PageStatus,
  TextBlockData
} from '../types';
import {
  ensureLayoutV2,
  createSection,
  addSection,
  removeSection,
  moveSection,
  changeSectionColumns,
  addBlockToSection,
  removeBlockFromSection,
  updateBlockInSection,
  moveBlockInColumn,
  moveBlockToColumn,
  duplicateSection,
  duplicateBlock,
  canAddSideAtIndex,
  resolveSideTargetColumnIndex,
  getBlockRowIndex
} from '../utils/pageLayoutHelpers';
import { ensureHeroInSection, isHeroV1, isHeroV2 } from '../utils/heroMigration';
import { sectionPresets, createSectionFromPreset } from '../utils/sectionPresets';

type PageForm = {
  id?: string;
  title: string;
  slug: string;
  pageKey?: string | null;
  description?: string | null;
  layout: PageLayoutV2;
  status: PageStatus;
  publishedAt?: string | null;
};

type BlockDraft = {
  id?: string;
  type: PageBlock['type'];
  colSpan?: number;
  data: TextBlockData | ImageBlockData | ButtonBlockData | CardBlockData | FormBlockData | HeroBlockData | ServicesBlockData | import('../types').PillsBlockData | import('../types').SpanBlockData | import('../types').ButtonGroupBlockData | import('../types').SocialLinksBlockData | import('../types').WhatsAppCtaBlockData | import('../types').ContactInfoBlockData | import('../types').RecentPostsBlockData | MediaTextBlockData;
  createdAt?: string;
  updatedAt?: string;
};

type BlockModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  sectionId: string;
  columnIndex: number;
  insertIndex: number;
  block?: PageBlock;
  placement?: 'insert' | 'side';
};

type MoveModalState = {
  open: boolean;
  sectionId: string;
  columnIndex: number;
  blockIndex: number;
  block?: PageBlock;
};

type DeleteModalState = {
  open: boolean;
  sectionId: string;
  columnIndex: number;
  block?: PageBlock;
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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const plainTextLength = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length;

const defaultTextData: TextBlockData = { contentHtml: '<p>Digite seu conteúdo</p>', width: 'normal', background: 'none' };
const defaultImageData: ImageBlockData = {
  mediaId: null,
  src: '',
  alt: '',
  caption: '',
  size: 100,
  align: 'center',
  naturalWidth: null,
  naturalHeight: null
};
const defaultButtonData: ButtonBlockData = { label: 'Chamada para ação', href: 'https://', newTab: true, variant: 'primary' };
const defaultCtaData: import('../types').CtaBlockData = {
  title: 'Vamos conversar?',
  text: 'Entre em contato para caminharmos juntos.',
  ctaLabel: 'Descobrir como',
  ctaHref: '/contato',
  ctaLinkMode: 'page',
  ctaPageKey: 'contato',
  imageId: null,
  imageUrl: null,
  imageAlt: ''
};
const defaultMediaTextData: MediaTextBlockData = {
  contentHtml: '<p>Texto ao lado da imagem.</p>',
  imageId: null,
  imageUrl: '',
  imageAlt: '',
  imageSide: 'left',
  imageWidth: 50,
  imageHeight: 75
};
const defaultCardData: CardBlockData = {
  title: 'Nossos Serviços',
  subtitle: null,
  items: [
    { id: uuidv4(), icon: '⚡', iconType: 'emoji', title: 'Rápido', text: 'Resultados em tempo recorde', ctaLabel: null, ctaHref: null },
    { id: uuidv4(), icon: '🎯', iconType: 'emoji', title: 'Preciso', text: 'Qualidade garantida', ctaLabel: null, ctaHref: null },
    { id: uuidv4(), icon: '✨', iconType: 'emoji', title: 'Profissional', text: 'Atendimento especializado', ctaLabel: null, ctaHref: null }
  ],
  layout: 'auto',
  variant: 'feature'
};
const defaultFormData: FormBlockData = {
  title: 'Fale comigo',
  description: null,
  fields: [
    { id: uuidv4(), type: 'text', label: 'Nome', placeholder: null, required: true, options: null },
    { id: uuidv4(), type: 'email', label: 'Email', placeholder: null, required: true, options: null },
    { id: uuidv4(), type: 'tel', label: 'WhatsApp', placeholder: null, required: false, options: null },
    { id: uuidv4(), type: 'textarea', label: 'Mensagem', placeholder: null, required: true, options: null }
  ],
  submitLabel: 'Enviar',
  successMessage: 'Mensagem enviada!',
  storeSummaryKeys: ['name', 'email', 'phone']
};
const defaultHeroData: import('../types').HeroBlockDataV1 = {
  heading: 'Psicologia para vidas com mais sentido',
  subheading: 'Caminhadas terapêuticas com escuta junguiana, argilaria e expressão criativa, para acolher sua história.',
  ctaLabel: 'Agendar sessão',
  ctaHref: '/contato',
  ctaLinkMode: 'page' as const,
  ctaPageKey: 'contato',
  secondaryCta: 'Conhecer a abordagem',
  secondaryHref: '/sobre',
  secondaryLinkMode: 'page' as const,
  secondaryPageKey: 'sobre',
  badges: ['Junguiana', 'Argilaria', 'Expressão criativa'],
  mediaMode: 'four_cards' as const,
  singleImage: null,
  singleCard: {
    quote:
      'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
    author: 'Cristiane Jageneski'
  },
  fourCards: {
    medium: {
      title:
        'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
      text: 'Cristiane Jageneski',
      icon: null,
      imageId: null,
      url: null,
      alt: null
    },
    small: [
      { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.', icon: null, imageId: null, url: null, alt: null },
      { title: 'Relações saudáveis', text: 'Comunicação e limites claros.', icon: null, imageId: null, url: null, alt: null },
      { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.', icon: null, imageId: null, url: null, alt: null }
    ]
  }
};

const defaultPillsData: import('../types').PillsBlockData = {
  pills: [
    { text: 'ARTETERAPIA', href: null, linkMode: null, articleSlug: null },
    { text: 'ORIENTAÇÃO VOCACIONAL', href: null, linkMode: null, articleSlug: null },
    { text: 'CERÂMICA', href: null, linkMode: null, articleSlug: null }
  ],
  size: 'sm',
  variant: 'neutral'
};

const defaultSpanData: import('../types').SpanBlockData = {
  kind: 'accent-bar'
};

const defaultButtonGroupData: import('../types').ButtonGroupBlockData = {
  buttons: [
    { label: 'Botão primário', href: '', variant: 'primary', linkMode: 'manual' },
    { label: 'Botão secundário', href: '', variant: 'secondary', linkMode: 'manual' }
  ],
  align: 'start',
  stackOnMobile: true
};

const defaultSocialLinksData: import('../types').SocialLinksBlockData = {
  title: 'Redes Sociais',
  variant: 'list',
  showIcons: true,
  columns: 1,
  align: 'left'
};

const defaultWhatsAppCtaData: import('../types').WhatsAppCtaBlockData = {
  label: 'Enviar mensagem',
  style: 'primary',
  openInNewTab: true,
  hideWhenDisabled: false
};

const defaultServicesData: ServicesBlockData = {
  sectionTitle: 'Serviços',
  buttonLabel: 'Saiba mais',
  items: [
    {
      id: uuidv4(),
      title: 'Psicoterapia Junguiana',
      description: 'Escuta simbólica para compreender emoções e padrões.',
      href: '/servicos/psicoterapia-junguiana'
    },
    {
      id: uuidv4(),
      title: 'Arteterapia',
      description: 'Expressão criativa para dar forma ao que você sente.',
      href: '/servicos/arteterapia'
    },
    {
      id: uuidv4(),
      title: 'Orientação vocacional',
      description: 'Clareza de caminhos e escolhas com significado.',
      href: '/servicos/orientacao-vocacional'
    },
    {
      id: uuidv4(),
      title: 'Cerâmica',
      description: 'Processo terapêutico através do gesto e da matéria.',
      href: '/servicos/ceramica'
    }
  ]
};

const defaultContactInfoData: import('../types').ContactInfoBlockData = {
  titleHtml: '<p>Entre em contato</p>',
  whatsappLabel: 'Enviar mensagem',
  whatsappVariant: 'primary',
  socialLinksTitle: 'Redes Sociais',
  socialLinksVariant: 'list'
};


const toBlockDraft = (block?: PageBlock): BlockDraft | null =>
  block
    ? {
        id: block.id,
        type: block.type,
        colSpan: block.colSpan ?? 1,
        data: block.data as any,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      }
    : null;

function PageEditorActions(_props: {
  page: PageForm;
  isNew: boolean;
  busy: boolean;
  draftAlert: string | null;
  formError: string | null;
  hasUploading: boolean;
  viewMode: 'edit' | 'preview';
  isHomePage?: boolean;
  backTo?: string;
  previewHref?: string;
  onViewModeChange: (mode: 'edit' | 'preview') => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
}) {
  const {
    page,
    isNew,
    busy,
    draftAlert,
    formError,
    hasUploading,
    viewMode,
    isHomePage,
    backTo,
    previewHref,
    onViewModeChange,
    onSaveDraft,
    onPublish,
    onMoveToDraft
  } = _props;
  const status = page.status ?? 'draft';
  const previewUrl = previewHref ?? (page.slug ? `/p/${page.slug}` : '/');
  const backTarget = backTo ?? '/admin/pages';
  return (
    <div className="editor-topbar compact">
      <div className="editor-topbar-left">
        <Link to={backTarget} className="btn btn-ghost">
          Voltar
        </Link>
        <ArticleStatusBadge status={status} />
        
        {/* Toggle Edição/Preview */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => onViewModeChange('edit')}
          >
            Edição
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
          >
            Preview
          </button>
        </div>
        
        {draftAlert && <span className="muted small">{draftAlert}</span>}
        {formError && <span className="muted small tone-danger">{formError}</span>}
        {hasUploading && <span className="muted small">Finalize uploads antes de salvar.</span>}
      </div>
      <div className="editor-topbar-actions">
        <button className="btn btn-outline" type="button" onClick={onSaveDraft} disabled={busy}>
          {isHomePage ? 'Salvar home' : 'Salvar rascunho'}
        </button>
        {!isHomePage &&
          (status === 'draft' ? (
            <button className="btn btn-primary" type="button" onClick={onPublish} disabled={busy || isNew}>
              Publicar
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={onMoveToDraft} disabled={busy}>
              Mover para rascunho
            </button>
          ))}
        {(!isHomePage && status === 'published') || isHomePage ? (
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => window.open(previewUrl, '_blank')}
            disabled={!previewUrl}
          >
            {isHomePage ? 'Ver site' : 'Visualizar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminPageEditorPage({ pageKey }: { pageKey?: string }) {
  const { id } = useParams<{ id: string }>();
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
  const [blockModal, setBlockModal] = useState<BlockModalState | null>(null);
  const [moveModal, setMoveModal] = useState<MoveModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [presetModal, setPresetModal] = useState<boolean>(false);
  const [hasUploading, setHasUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Validation hook
  const {
    errors: validationErrors,
    fieldStates,
    markFieldTouched,
    validateForPublication
  } = usePageValidation(page);

  useEffect(() => {
    if (existingPage) {
      console.log('[LOAD DEBUG] Raw existing page layout:', existingPage.layout);
      
      // [DEBUG C] Log Hero ANTES de normalizar no client
      const rawLayout = existingPage.layout as any;
      const rawHeroSection = rawLayout?.sections?.find((s: any) => s.kind === 'hero' || s.cols?.some((c: any) => c.blocks?.some((b: any) => b.type === 'hero')));
      if (rawHeroSection) {
        const rawHeroBlock = rawHeroSection.cols?.flatMap((c: any) => c.blocks || []).find((b: any) => b.type === 'hero');
        if (rawHeroBlock) {
          console.log('[CLIENT C1] Hero vindo do GET (RAW):');
          console.log('  - version:', rawHeroBlock.data?.version);
          console.log('  - rightVariant:', rawHeroBlock.data?.rightVariant);
          console.log('  - right blocks:', rawHeroBlock.data?.right?.map((b: any) => b.type));
        }
      }
      
      const normalizedLayout = ensureLayoutV2(existingPage.layout);
      console.log('[LOAD DEBUG] After ensureLayoutV2:', normalizedLayout);
      
      // [DEBUG C2] Log Hero AP\u00d3S normalizar no client
      const normHeroSection = normalizedLayout.sections?.find((s: any) => s.kind === 'hero' || s.cols?.some((c: any) => c.blocks?.some((b: any) => b.type === 'hero')));
      if (normHeroSection) {
        const normHeroBlock = normHeroSection.cols?.flatMap((c: any) => c.blocks || []).find((b: any) => b.type === 'hero');
        if (normHeroBlock) {
          console.log('[CLIENT C2] Hero AP\u00d3S ensureLayoutV2:');
          console.log('  - version:', normHeroBlock.data?.version);
          console.log('  - rightVariant:', normHeroBlock.data?.rightVariant);
          console.log('  - right blocks:', normHeroBlock.data?.right?.map((b: any) => b.type));
        }
      }
      
      // For Home page, ensure Hero exists in first section
      let finalLayout = normalizedLayout;
      if (isHomePage && normalizedLayout.sections.length > 0) {
        const firstSection = normalizedLayout.sections[0];
        const hasHero = firstSection.cols?.some(col => 
          col.blocks?.some(block => block.type === 'hero')
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

  useEffect(() => {
    if (!blockModal) {
      setHasUploading(false);
    }
  }, [blockModal]);

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
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Falha ao salvar página.';
      setFormError(message);
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
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Falha ao atualizar página.';
      setFormError(message);
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

  const busy =
    createMutation.isPending || updateMutation.isPending || publishMutation.isPending || unpublishMutation.isPending || hasUploading;

  const validatePage = (current: PageForm) => {
    if (!current.title.trim() || current.title.trim().length < 3) return 'Informe um titulo com ao menos 3 caracteres.';
    if (!isHomePage && (!current.slug.trim() || current.slug.trim().length < 2)) return 'Informe um slug para a pagina.';
    return null;
  };

  const saveDraft = async () => {
    const error = validatePage(page);
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
    
    // [DEBUG A] Log Hero ANTES do PUT
    const heroSection = payload.layout.sections?.find(s => s.kind === 'hero' || s.cols?.some(c => c.blocks?.some(b => b.type === 'hero')));
    const heroBlock = heroSection?.cols?.flatMap(c => c.blocks || []).find(b => b.type === 'hero');
    if (heroBlock && heroBlock.type === 'hero') {
      const heroData = heroBlock.data as any;
      console.log('[CLIENT A] Hero no payload ANTES do PUT:');
      console.log('  - version:', heroData.version);
      console.log('  - rightVariant:', heroData.rightVariant);
      console.log('  - right blocks:', heroData.right?.map((b: any) => b.type));
      console.log('  - Full Hero data:', JSON.stringify(heroData, null, 2));
    }
    
    if (isHomePage) {
      if (!page.id) {
        setFormError('Home não carregada. Tente novamente.');
        return null;
      }
      const updated = await updateMutation.mutateAsync({ id: page.id, payload });
      return updated.page;
    }
    if (isNew || !page.id) {
      const created = await createMutation.mutateAsync(payload);
      return created;
    }
    const updated = await updateMutation.mutateAsync({ id: page.id, payload });
    return updated.page;
  };

  const handlePublish = async () => {
    if (isHomePage) {
      await saveDraft();
      return;
    }
    // Executar validação antes de publicar
    const errors = validateForPublication();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    
    const saved = await saveDraft();
    if (!saved?.id) return;
    await publishMutation.mutateAsync(saved.id);
  };

  const handleMoveToDraft = () => {
    if (!page.id || isHomePage) return;
    unpublishMutation.mutate(page.id);
  };

  // Section handlers
  const handleAddSection = () => {
    setPresetModal(true);
  };

  const handleSelectPreset = (presetId: string) => {
    const newSection = createSectionFromPreset(presetId);
    if (newSection) {
      // Validar: não permitir adicionar Hero se já existir uma
      if (newSection.kind === 'hero' && page.layout.sections.some((s) => s.kind === 'hero')) {
        alert('Já existe uma seção Hero na página. Apenas uma seção Hero é permitida.');
        setPresetModal(false);
        return;
      }
      setPage((prev) => ({ ...prev, layout: addSection(prev.layout, newSection) }));
    }
    setPresetModal(false);
  };

  const handleAddBlankSection = () => {
    const newSection = createSection(2);
    setPage((prev) => ({ ...prev, layout: addSection(prev.layout, newSection) }));
    setPresetModal(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    // Não permitir remover seção Hero
    const section = page.layout.sections.find(s => s.id === sectionId);
    if (section?.kind === 'hero') {
      return;
    }
    setPage((prev) => ({ ...prev, layout: removeSection(prev.layout, sectionId) }));
  };

  const handleDuplicateSection = (sectionId: string) => {
    // Não permitir duplicar seção Hero
    const section = page.layout.sections.find(s => s.id === sectionId);
    if (section?.kind === 'hero') {
      return;
    }
    setPage((prev) => ({ ...prev, layout: duplicateSection(prev.layout, sectionId) }));
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    // Não permitir mover seção Hero
    const section = page.layout.sections.find(s => s.id === sectionId);
    if (section?.kind === 'hero') {
      return;
    }
    setPage((prev) => ({ ...prev, layout: moveSection(prev.layout, sectionId, direction) }));
  };

  const handleChangeSectionColumns = (sectionId: string, columns: 1 | 2 | 3) => {
    setPage((prev) => ({ ...prev, layout: changeSectionColumns(prev.layout, sectionId, columns) }));
  };

  const handleChangeSectionBackground = (sectionId: string, background: 'none' | 'soft' | 'dark' | 'earthy') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId
            ? { ...s, settings: { ...s.settings, background, backgroundStyle: background } }
            : s
        )
      }
    }));
  };

  const handleChangeSectionPadding = (sectionId: string, padding: 'normal' | 'compact' | 'large') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId ? { ...s, settings: { ...s.settings, padding, density: padding } } : s
        )
      }
    }));
  };

  const handleChangeSectionMaxWidth = (sectionId: string, maxWidth: 'normal' | 'wide') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId ? { ...s, settings: { ...s.settings, maxWidth, width: maxWidth } } : s
        )
      }
    }));
  };

  const handleChangeSectionHeight = (sectionId: string, height: 'normal' | 'tall') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId ? { ...s, settings: { ...s.settings, height } } : s
        )
      }
    }));
  };

  // Block handlers
  const handleOpenAddBlock = (sectionId: string, columnIndex: number, insertIndex: number) => {
    setBlockModal({ open: true, mode: 'add', sectionId, columnIndex, insertIndex, placement: 'insert' });
  };

  const handleOpenEditBlock = (sectionId: string, columnIndex: number, block: PageBlock, blockIndex: number) => {
    setBlockModal({ open: true, mode: 'edit', sectionId, columnIndex, insertIndex: blockIndex, block });
  };

  const handleSaveBlock = (draft: BlockDraft) => {
    if (!blockModal) return;
    const now = new Date().toISOString();
    const section = page.layout.sections.find((s) => s.id === blockModal.sectionId);
    const maxSpan = Math.max(
      1,
      Math.min(
        (section?.settings?.columnsLayout as number) ||
          section?.columnsLayout ||
          section?.columns ||
          2,
        3
      )
    );
    const colSpan = Math.max(1, Math.min((draft as any).colSpan ?? (blockModal.block?.colSpan ?? 1), maxSpan));
    const block: PageBlock = {
      id: draft.id ?? uuidv4(),
      type: draft.type,
      data: draft.data as any,
      colSpan,
      rowIndex: blockModal.mode === 'edit' ? blockModal.block?.rowIndex : undefined,
      createdAt: draft.createdAt ?? now,
      updatedAt: now
    };

    setPage((prev) => {
      let newLayout = prev.layout;
      if (blockModal.mode === 'add') {
        const placement = blockModal.placement === 'side' ? 'place' : 'insert';
        newLayout = addBlockToSection(
          newLayout,
          blockModal.sectionId,
          blockModal.columnIndex,
          block,
          blockModal.insertIndex,
          placement
        );
      } else {
        newLayout = updateBlockInSection(newLayout, blockModal.sectionId, blockModal.columnIndex, blockModal.block!.id, block);
      }
      return { ...prev, layout: newLayout };
    });
    setBlockModal(null);
  };

  const handleMoveBlock = (sectionId: string, columnIndex: number, blockId: string, direction: 'up' | 'down') => {
    setPage((prev) => ({
      ...prev,
      layout: moveBlockInColumn(prev.layout, sectionId, columnIndex, blockId, direction)
    }));
  };

  const handleOpenMoveModal = (sectionId: string, columnIndex: number, blockIndex: number, block: PageBlock) => {
    setMoveModal({ open: true, sectionId, columnIndex, blockIndex, block });
  };

  const handleConfirmMoveColumn = (targetColumn: number) => {
    if (!moveModal) return;
    setPage((prev) => ({
      ...prev,
      layout: moveBlockToColumn(prev.layout, moveModal.sectionId, moveModal.columnIndex, targetColumn, moveModal.block!.id)
    }));
    setMoveModal(null);
  };

  const handleDeleteBlock = (sectionId: string, columnIndex: number, blockId: string) => {
    const section = page.layout.sections.find((s) => s.id === sectionId);
    const targetBlock = section?.cols?.[columnIndex]?.blocks.find((b) => b.id === blockId);
    if (targetBlock?.type === 'hero') {
      setDeleteModal(null);
      return;
    }
    setPage((prev) => ({
      ...prev,
      layout: removeBlockFromSection(prev.layout, sectionId, columnIndex, blockId)
    }));
    setDeleteModal(null);
  };

  const handleAddBlockSide = (sectionId: string, fromColumnIndex: number, rowIndex: number) => {
    const section = page.layout.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const targetColumnIndex = resolveSideTargetColumnIndex({
      columns: section.cols,
      fromColumnIndex,
      direction: 'right'
    });
    if (targetColumnIndex === null) return;

    const canAddSide = canAddSideAtIndex({
      columns: section.cols,
      fromColumnIndex,
      fromIndex: rowIndex,
      direction: 'right'
    });
    if (!canAddSide) return;

    setBlockModal({
      open: true,
      mode: 'add',
      sectionId,
      columnIndex: targetColumnIndex,
      insertIndex: rowIndex,
      placement: 'side'
    });
  };

  const handleDuplicateBlock = (sectionId: string, columnIndex: number, blockId: string) => {
    setPage((prev) => ({
      ...prev,
      layout: duplicateBlock(prev.layout, sectionId, columnIndex, blockId)
    }));
  };

  if (isHomePage && isLoadingPage) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Pagina inicial</h1>
          <p className="muted">Carregando builder...</p>
        </div>
        <div className="admin-card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: '18px', width: '180px' }} />
          <div className="skeleton" style={{ height: '12px', width: '60%' }} />
          <div className="skeleton" style={{ height: '280px', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (isHomePage && isPageError) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-card">
          <div className="admin-empty">
            <h3>Erro ao carregar a home</h3>
            <p className="muted">Não foi possivel recuperar os blocos da pagina inicial.</p>
            <button className="btn btn-primary" type="button" onClick={() => refetchPage()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page editor-page">
      <SeoHead title={isNew ? 'Nova página' : `Editar: ${page.title}`} />
      <PageEditorActions
        page={page}
        isNew={isNew || !page.id}
        busy={busy}
        draftAlert={draftAlert}
        formError={formError}
        hasUploading={hasUploading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSaveDraft={() => saveDraft()}
        onPublish={handlePublish}
        onMoveToDraft={handleMoveToDraft}
      />

      <div className="editor-body">
        <div className="editor-container">
          <div className="editor-grid">
            <div className="editor-main">
              {viewMode === 'preview' ? (
                <div className="page-preview-wrapper">
                  {page.layout.sections.length === 0 ? (
                    <div className="admin-empty">
                      <p>Nenhuma seção adicionada. Volte para o modo de edição para adicionar conteúdo.</p>
                    </div>
                  ) : (
                    <PageRendererCore
                      layout={page.layout}
                      enableFormSubmit={false}
                      pageSlug={isHomePage ? 'home' : page.slug || 'preview'}
                    />
                  )}
                </div>
              ) : (
                <div className="page-editor-canvas">
                  {page.layout.sections.length === 0 && (
                    <div className="admin-empty">
                      <p>Nenhuma seção adicionada. Clique em "+ Adicionar seção" para começar.</p>
                    </div>
                  )}
                  {page.layout.sections.map((section, sectionIndex) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      sectionIndex={sectionIndex}
                      totalSections={page.layout.sections.length}
                      onChangeSectionColumns={(cols) => handleChangeSectionColumns(section.id, cols)}
                      onChangeSectionBackground={(bg) => handleChangeSectionBackground(section.id, bg)}
                      onChangeSectionPadding={(pad) => handleChangeSectionPadding(section.id, pad)}
                      onChangeSectionMaxWidth={(mw) => handleChangeSectionMaxWidth(section.id, mw)}
                      onChangeSectionHeight={(h) => handleChangeSectionHeight(section.id, h)}
                      onMoveSection={(dir) => handleMoveSection(section.id, dir)}
                      onRemoveSection={() => handleRemoveSection(section.id)}
                      onDuplicateSection={() => handleDuplicateSection(section.id)}
                      onAddBlock={(colIndex, insertIndex) => handleOpenAddBlock(section.id, colIndex, insertIndex)}
                      onAddBlockSide={(colIndex, rowIndex) => handleAddBlockSide(section.id, colIndex, rowIndex)}
                      onEditBlock={(colIndex, block, blockIndex) => handleOpenEditBlock(section.id, colIndex, block, blockIndex)}
                      onMoveBlock={(colIndex, blockId, dir) => handleMoveBlock(section.id, colIndex, blockId, dir)}
                      onMoveBlockColumn={(colIndex, blockIndex, block) => handleOpenMoveModal(section.id, colIndex, blockIndex, block)}
                      onDeleteBlock={(colIndex, block) => setDeleteModal({ open: true, sectionId: section.id, columnIndex: colIndex, block })}
                      onDuplicateBlock={(colIndex, blockId) => handleDuplicateBlock(section.id, colIndex, blockId)}
                    />
                  ))}
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn btn-outline" type="button" onClick={handleAddSection}>
                      + Adicionar seção
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="editor-side">
              <div className="admin-card editor-card" style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="muted small">Configurações da Página</div>
                <div className="editor-field">
                  <label>Título</label>
                  <ValidationInput
                    fieldId="page-title"
                    hasError={fieldStates['page-title']?.hasError || false}
                    errorMessage={fieldStates['page-title']?.errorMessage}
                    showError={fieldStates['page-title']?.isTouched}
                  >
                    <input
                      value={page.title}
                      onChange={(e) => setPage((prev) => ({ ...prev, title: e.target.value }))}
                      onBlur={() => markFieldTouched('page-title')}
                      placeholder="Título da página"
                    />
                  </ValidationInput>
                </div>
                <div className="editor-field">
                  <label>Slug</label>
                  <ValidationInput
                    fieldId="page-slug"
                    hasError={fieldStates['page-slug']?.hasError || false}
                    errorMessage={fieldStates['page-slug']?.errorMessage}
                    showError={fieldStates['page-slug']?.isTouched}
                  >
                    <input
                      value={page.slug}
                      onChange={(e) => setPage((prev) => ({ ...prev, slug: e.target.value }))}
                      onBlur={(e) => {
                        markFieldTouched('page-slug');
                        setPage((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                      }}
                      placeholder="ex: sobre, contato, servicos"
                    />
                  </ValidationInput>
                  <p className="muted small">URLs públicas ficam em /p/slug. Use letras minúsculas e hifens.</p>
                </div>
                <div className="editor-field">
                  <label>Descrição</label>
                  <textarea
                    value={page.description ?? ''}
                    onChange={(e) => setPage((prev) => ({ ...prev, description: e.target.value }))}
                    onBlur={() => markFieldTouched('page-description')}
                    rows={3}
                  />
                  <CharCounter text={page.description || ''} limit={300} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BlockEditorModal
        state={blockModal}
        onClose={() => setBlockModal(null)}
        onSave={handleSaveBlock}
        onUploadingChange={setHasUploading}
        columnCount={
          blockModal
            ? Math.max(
                1,
                Math.min(
                  (page.layout.sections.find((s) => s.id === blockModal.sectionId)?.settings?.columnsLayout as number) ||
                    page.layout.sections.find((s) => s.id === blockModal.sectionId)?.columnsLayout ||
                    page.layout.sections.find((s) => s.id === blockModal.sectionId)?.columns ||
                    2,
                  3
                )
              )
            : 2
        }
      />

      <SectionPresetModal
        open={presetModal}
        onClose={() => setPresetModal(false)}
        onSelectPreset={handleSelectPreset}
        onAddBlank={handleAddBlankSection}
        sections={page.layout.sections}
      />

      <MoveBlockModal
        state={moveModal}
        section={moveModal ? page.layout.sections.find((s) => s.id === moveModal.sectionId) : undefined}
        onClose={() => setMoveModal(null)}
        onConfirm={handleConfirmMoveColumn}
      />

      <ConfirmModal
        isOpen={!!deleteModal?.block}
        onClose={() => setDeleteModal(null)}
        title="Remover bloco"
        description="Tem certeza que deseja remover este bloco?"
        onConfirm={() => deleteModal?.block && handleDeleteBlock(deleteModal.sectionId, deleteModal.columnIndex, deleteModal.block.id)}
        confirmLabel="Remover"
      />

      <ValidationErrorsModal
        isOpen={showValidationErrors}
        onClose={() => setShowValidationErrors(false)}
        errors={validationErrors}
        onGoToError={(error) => {
          console.log('Go to error:', error);
          setShowValidationErrors(false);
        }}
      />
    </div>
  );
}

function SectionEditor(_props: {
  section: PageSection;
  sectionIndex: number;
  totalSections: number;
  onChangeSectionColumns: (columns: 1 | 2 | 3) => void;
  onChangeSectionBackground: (background: 'none' | 'soft' | 'dark' | 'earthy') => void;
  onChangeSectionPadding: (padding: 'normal' | 'compact' | 'large') => void;
  onChangeSectionMaxWidth: (maxWidth: 'normal' | 'wide') => void;
  onChangeSectionHeight: (height: 'normal' | 'tall') => void;
  onMoveSection: (direction: 'up' | 'down') => void;
  onRemoveSection: () => void;
  onDuplicateSection: () => void;
  onAddBlock: (columnIndex: number, insertIndex: number) => void;
  onAddBlockSide: (columnIndex: number, rowIndex: number) => void;
  onEditBlock: (columnIndex: number, block: PageBlock, blockIndex: number) => void;
  onMoveBlock: (columnIndex: number, blockId: string, direction: 'up' | 'down') => void;
  onMoveBlockColumn: (columnIndex: number, blockIndex: number, block: PageBlock) => void;
  onDeleteBlock: (columnIndex: number, block: PageBlock) => void;
  onDuplicateBlock: (columnIndex: number, blockId: string) => void;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onChangeSectionColumns,
    onChangeSectionBackground,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight,
    onMoveSection,
    onRemoveSection,
    onDuplicateSection,
    onAddBlock,
    onAddBlockSide,
    onEditBlock,
    onMoveBlock,
    onMoveBlockColumn,
    onDeleteBlock,
    onDuplicateBlock
  } = _props;
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const background = (section.settings?.backgroundStyle || section.settings?.background || 'none') as 'none' | 'soft' | 'dark' | 'earthy';
  const padding = (section.settings?.density || section.settings?.padding || 'normal') as 'normal' | 'compact' | 'large';
  const maxWidth = (section.settings?.width || section.settings?.maxWidth || 'normal') as 'normal' | 'wide';
  const height = (section.settings?.height || 'normal') as 'normal' | 'tall';
  const columnsCount = (section.settings?.columnsLayout as number) || section.columnsLayout || section.columns || 1;
  const columnOptions = section.columns === 1 ? [1, 2, 3] : [2, 3];
  const rowCount =
    section.cols.reduce((max, col) => {
      col.blocks.forEach((block, index) => {
        max = Math.max(max, getBlockRowIndex(block, index));
      });
      return max;
    }, -1) + 1;
  const columnRows = section.cols.map((col) => {
    const map = new Map<number, { block: PageBlock; blockIndex: number }>();
    col.blocks.forEach((block, index) => {
      const rowIndex = getBlockRowIndex(block, index);
      if (!map.has(rowIndex)) {
        map.set(rowIndex, { block, blockIndex: index });
      }
    });
    return map;
  });

  const isHeroSection = section.kind === 'hero';

  return (
    <div className="page-section-editor admin-card" style={{ marginBottom: '1.5rem' }} data-bg={background}>
      <div className="page-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <strong>{isHeroSection ? 'Hero (Secao Fixa)' : `Secao ${sectionIndex + 1}`}</strong>
          {!isHeroSection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Colunas</span>
              <div className="page-columns-toggle compact">
                {columnOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={section.columns === c ? 'active' : ''}
                    onClick={() => onChangeSectionColumns(c as 1 | 2 | 3)}
                  >
                    {c} col{c > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'none', label: 'Sem fundo' },
                { value: 'soft', label: 'Suave' },
                { value: 'dark', label: 'Escuro' },
                { value: 'earthy', label: 'Terroso' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={background === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionBackground(opt.value as 'none' | 'soft' | 'dark' | 'earthy')}
                  title={`Fundo: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'compact', label: 'Compacto' },
                { value: 'normal', label: 'Normal' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={padding === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionPadding(opt.value as 'normal' | 'compact' | 'large')}
                  title={`Espacamento: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'normal', label: 'Altura Normal' },
                { value: 'tall', label: 'Altura Alta' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={height === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionHeight(opt.value as 'normal' | 'tall')}
                  title={`Altura: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isHeroSection && (
            <div className="page-columns-toggle compact">
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'wide', label: 'Largo' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={maxWidth === opt.value ? 'active' : ''}
                  onClick={() => onChangeSectionMaxWidth(opt.value as 'normal' | 'wide')}
                  title={`Largura: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="admin-actions" style={{ gap: '0.35rem' }}>
          {!isHeroSection && (
            <>
              <IconButton
                icon="arrow-up"
                label="Mover secao para cima"
                onClick={() => onMoveSection('up')}
                disabled={sectionIndex === 0}
              />
              <IconButton
                icon="arrow-down"
                label="Mover secao para baixo"
                onClick={() => onMoveSection('down')}
                disabled={sectionIndex === totalSections - 1}
              />
              <IconButton icon="copy" label="Duplicar secao" onClick={onDuplicateSection} />
              <IconButton icon="trash" label="Remover secao" tone="danger" onClick={() => setShowConfirmDelete(true)} />
            </>
          )}
          {isHeroSection && (
            <span className="muted small">Esta secao nao pode ser movida ou removida</span>
          )}
        </div>
      </div>

      <div
        className="page-editor-columns"
        style={{ gridTemplateColumns: `repeat(${section.settings?.columnsLayout ?? section.columnsLayout ?? section.columns}, minmax(0, 1fr))` }}
      >
        {section.cols.map((col, colIndex) => (
          <div key={`header-${col.id}`} className="page-col-header" style={{ gridColumn: `${colIndex + 1} / span 1` }}>
            <strong>Coluna {colIndex + 1}</strong>
          </div>
        ))}

        {Array.from({ length: rowCount }).map((_, rowIndex) => {
          // Verificar quantas colunas têm blocos nesta linha
          const blocksInRow = section.cols.map((_, colIndex) => columnRows[colIndex].get(rowIndex)).filter(Boolean);

          // Se a linha está completamente vazia, renderizar 1 botão full-width
          if (blocksInRow.length === 0) {
            return (
              <div
                key={`empty-row-${rowIndex}`}
                className="page-block-wrapper"
                style={{ gridColumn: '1 / -1', gridRow: rowIndex + 1 }}
              >
                <AddBlockButton 
                  onClick={() => onAddBlock(0, rowIndex)} 
                  label="+ Adicionar bloco (linha vazia)"
                />
              </div>
            );
          }

          // Renderizar blocos e slots vazios
          return section.cols.map((col, colIndex) => {
            const entry = columnRows[colIndex].get(rowIndex);
            
            if (!entry) {
              // Slot vazio em linha parcialmente preenchida
              return (
                <div
                  key={`empty-${col.id}-${rowIndex}`}
                  className="page-block-wrapper"
                  style={{ gridColumn: `${colIndex + 1} / span 1`, gridRow: rowIndex + 1 }}
                >
                  <AddBlockButton onClick={() => onAddBlock(colIndex, rowIndex)} />
                </div>
              );
            }

            const { block, blockIndex } = entry;
            const isLocked = block.isLocked || block.type === 'hero';
            const isFullWidth = block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services';
            const span = isFullWidth ? columnsCount : Math.min(block.colSpan ?? 1, columnsCount);
            const canAddSide = canAddSideAtIndex({
              columns: section.cols,
              fromColumnIndex: colIndex,
              fromIndex: rowIndex,
              direction: 'right'
            });
            
            return (
              <div
                key={block.id}
                className="page-block-wrapper"
                style={{ 
                  gridColumn: isFullWidth ? '1 / -1' : `${colIndex + 1} / span ${span}`, 
                  gridRow: rowIndex + 1 
                }}
              >
                <BlockCard
                  block={block}
                  onEdit={() => onEditBlock(colIndex, block, blockIndex)}
                  onDelete={() => !isLocked && onDeleteBlock(colIndex, block)}
                  onDuplicate={() => onDuplicateBlock(colIndex, block.id)}
                  onMoveUp={() => !isLocked && onMoveBlock(colIndex, block.id, 'up')}
                  onMoveDown={() => !isLocked && onMoveBlock(colIndex, block.id, 'down')}
                  onMoveColumn={() => onMoveBlockColumn(colIndex, blockIndex, block)}
                  onAddSide={() => onAddBlockSide(colIndex, rowIndex)}
                  canAddSide={canAddSide}
                  disableMoveUp={isLocked || rowIndex === 0}
                  disableMoveDown={isLocked || rowIndex === rowCount - 1}
                />
              </div>
            );
          });
        })}

        {rowCount === 0 &&
          section.cols.map((col, colIndex) => (
            <div
              key={`empty-${col.id}`}
              className="admin-empty"
              style={{ gridColumn: `${colIndex + 1} / span 1`, gridRow: 1 }}
            >
              Sem blocos nesta coluna.
            </div>
          ))}

        {/* Botão de adicionar no final - apenas 1 full-width se houver múltiplas colunas */}
        {columnsCount > 1 ? (
          <AddBlockButton
            key="add-end-fullwidth"
            onClick={() => onAddBlock(0, rowCount)}
            style={{ gridColumn: '1 / -1', gridRow: rowCount + 1 }}
            label="+ Adicionar bloco (nova linha)"
          />
        ) : (
          <AddBlockButton
            key="add-end-single"
            onClick={() => onAddBlock(0, rowCount)}
            style={{ gridColumn: '1 / span 1', gridRow: rowCount + 1 }}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção? Todos os blocos serão perdidos."
        onConfirm={() => {
          onRemoveSection();
          setShowConfirmDelete(false);
        }}
        confirmLabel="Remover"
      />
    </div>
  );
}

function AddBlockButton(_props: { onClick: () => void; style?: React.CSSProperties; label?: string }) {
  const { onClick, style, label } = _props;
  return (
    <button type="button" className="page-add-block" onClick={onClick} style={style}>
      {label || '+ Adicionar bloco'}
    </button>
  );
}

function BlockCard(_props: {
  block: PageBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveColumn: () => void;
  onAddSide: () => void;
  canAddSide: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const {
    block,
    onEdit,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveColumn,
    onAddSide,
    canAddSide,
    disableMoveUp,
    disableMoveDown
  } = _props;
  const labelMap: Record<string, string> = {
    text: 'Texto',
    image: 'Imagem',
    button: 'Botão',
    cards: 'Cards',
    'media-text': 'Imagem + Texto',
    form: 'Formulário',
    hero: 'Hero',
    pills: 'Pills',
    span: 'Elemento',
    buttonGroup: 'Grupo de Botões',
    services: 'Serviços',
    'contact-info': 'Informações de Contato'
  };
  const label = labelMap[block.type] || block.type;
  
  // Hero V2 é fixo: não pode ser movido ou deletado
  const isHero = block.type === 'hero';
  
  return (
    <div className="page-block-card admin-card">
      <div className="page-block-card-header">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            {label}
            {isHero && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>(fixo)</span>}
          </p>
        </div>
        <div className="admin-actions" style={{ gap: '0.35rem' }}>
          {!isHero && <IconButton icon="arrow-up" label="Mover para cima" onClick={onMoveUp} disabled={disableMoveUp} />}
          {!isHero && <IconButton icon="arrow-down" label="Mover para baixo" onClick={onMoveDown} disabled={disableMoveDown} />}
          <IconButton icon="edit" label="Editar" tone="info" onClick={onEdit} />
          {!isHero && <IconButton icon="globe" label="Mover coluna" onClick={onMoveColumn} />}
          {!isHero && canAddSide && (
            <button 
              type="button" 
              onClick={onAddSide}
              className="icon-btn"
              title="Adicionar ao lado"
              style={{
                padding: '0.35rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s'
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
          {!isHero && <IconButton icon="copy" label="Duplicar" onClick={onDuplicate} />}
          {!isHero && <IconButton icon="trash" label="Remover" tone="danger" onClick={onDelete} />}
        </div>
      </div>
      <div className="page-block-card-body">
        <PageBlockView block={block} />
      </div>
    </div>
  );
}

function MoveBlockModal(_props: {
  state: MoveModalState | null;
  section?: PageSection;
  onClose: () => void;
  onConfirm: (targetColumn: number) => void;
}) {
  const { state, section, onClose, onConfirm } = _props;
  const [target, setTarget] = useState(0);

  useEffect(() => {
    if (state) setTarget(state.columnIndex);
  }, [state?.columnIndex]);

  const columns = section?.columns ?? 1;
  const columnsLayout = section?.settings?.columnsLayout ?? section?.columnsLayout ?? columns ?? 1;
  const colCount = Math.max(1, Math.min(columnsLayout, 3));

  return (
    <Modal isOpen={!!state?.open} onClose={onClose} title="Mover bloco para coluna" description="Selecione a coluna de destino.">
      <div className="page-columns-toggle">
        {Array.from({ length: colCount }).map((_, idx) => (
          <button key={idx} type="button" className={target === idx ? 'active' : ''} onClick={() => setTarget(idx)}>
            Coluna {idx + 1}
          </button>
        ))}
      </div>
      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" type="button" onClick={() => onConfirm(target)}>
          Mover
        </button>
      </div>
    </Modal>
  );
}

function BlockEditorModal(_props: {
  state: BlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  onUploadingChange?: (uploading: boolean) => void;
  columnCount?: number;
}) {
  const { state, onClose, onSave, onUploadingChange, columnCount = 2 } = _props;
  const initialDraft = toBlockDraft(state?.block);
  const [draft, setDraft] = useState<BlockDraft | null>(initialDraft);
  const [selectedType, setSelectedType] = useState<PageBlock['type'] | null>(initialDraft?.type ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setSelectedType(initialDraft?.type ?? null);
    setError(null);
  }, [state?.block?.id, state?.open]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleSelectType = (type: PageBlock['type']) => {
    setSelectedType(type);
    if (!draft || draft.type !== type) {
      const defaults: BlockDraft['data'] = 
        type === 'text' ? defaultTextData : 
        type === 'image' ? defaultImageData : 
        type === 'button' ? defaultButtonData : 
        type === 'cards' ? defaultCardData : 
        type === 'form' ? defaultFormData :
        type === 'pills' ? defaultPillsData :
        type === 'span' ? defaultSpanData :
        type === 'buttonGroup' ? defaultButtonGroupData :
        type === 'social-links' ? defaultSocialLinksData :
        type === 'whatsapp-cta' ? defaultWhatsAppCtaData :
        type === 'cta' ? defaultCtaData :
        type === 'media-text' ? defaultMediaTextData :
        type === 'services' ? defaultServicesData :
        type === 'contact-info' ? defaultContactInfoData :
        defaultHeroData; // hero é o fallback
      const span = type === 'hero' || type === 'recent-posts' || type === 'services' ? columnCount : Math.min(columnCount, 1);
      setDraft({ type, data: defaults, colSpan: span });
    }
  };

  const handleSave = () => {
    if (!draft || !selectedType) {
      setError('Escolha um tipo de bloco.');
      return;
    }
    if (draft.type === 'text') {
      const content = (draft.data as TextBlockData).contentHtml || '';
      if (!plainTextLength(content)) {
        setError('Preencha o conteúdo do texto.');
        return;
      }
    }
    if (draft.type === 'image') {
      const data = draft.data as ImageBlockData;
      if (!data.src) {
        setError('Selecione ou envie uma imagem.');
        return;
      }
    }
    if (draft.type === 'button') {
      const data = draft.data as ButtonBlockData;
      if (!data.label.trim()) {
        setError('Informe o texto do botão.');
        return;
      }
      const link = data.href.trim();
      const isValid =
        /^https?:\/\//i.test(link) ||
        link.startsWith('/') ||
        /^mailto:/i.test(link) ||
        /^tel:/i.test(link) ||
        link.startsWith('#') ||
        /^https?:\/\/wa\.me/i.test(link) ||
        /^wa\.me/i.test(link) ||
        /^\/\//.test(link);
      if (!isValid) {
        setError('Use http(s), mailto, tel, #ancora ou um caminho iniciando com /.');
        return;
      }
    }
    if (draft.type === 'cta') {
      const data = draft.data as CtaBlockData;
      if (!data.title?.trim()) {
        setError('Informe o título do CTA.');
        return;
      }
      if (!data.ctaLabel?.trim()) {
        setError('Informe o texto do botão do CTA.');
        return;
      }
      const link = (data.ctaHref ?? '').trim();
      const isValid =
        /^https?:\/\//i.test(link) ||
        link.startsWith('/') ||
        /^mailto:/i.test(link) ||
        /^tel:/i.test(link) ||
        link.startsWith('#') ||
        /^https?:\/\/wa\.me/i.test(link) ||
        /^wa\.me/i.test(link) ||
        /^\/\//.test(link);
      if (!isValid) {
        setError('Use http(s), mailto, tel, #ancora ou um caminho iniciando com /.');
        return;
      }
    }
    if (draft.type === 'cards') {
      const data = draft.data as CardBlockData;
      if (data.items.length === 0) {
        setError('Adicione pelo menos um card.');
        return;
      }
      for (const item of data.items) {
        if (!item.title.trim() || !item.text.trim()) {
          setError('Todos os cards devem ter título e texto.');
          return;
        }
        if (item.ctaHref && !/^https?:\/\//i.test(item.ctaHref.trim())) {
          setError('URLs de CTA devem iniciar com http(s).');
          return;
        }
      }
    }
    if (draft.type === 'services') {
      const data = draft.data as ServicesBlockData;
      if (!data.sectionTitle?.trim()) {
        setError('Informe o título da seção de serviços.');
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError('Adicione pelo menos um serviço.');
        return;
      }
      for (const item of data.items) {
        if (!item.title.trim() || !item.href.trim()) {
          setError('Todos os serviços precisam de título e link.');
          return;
        }
      }
    }
    if (draft.type === 'form') {
      const data = draft.data as FormBlockData;
      if (data.fields.length === 0) {
        setError('Adicione pelo menos um campo ao formulário.');
        return;
      }
      for (const field of data.fields) {
        if (!field.label.trim()) {
          setError('Todos os campos devem ter um rótulo.');
          return;
        }
        if (field.type === 'select' && (!field.options || field.options.length === 0)) {
          setError('Campos do tipo "select" devem ter opções.');
          return;
        }
      }
    }
    if (draft.type === 'hero') {
      const data = draft.data as HeroBlockData;
      // Only validate V1 hero properties if it's actually a V1 hero
      if (isHeroV1(data)) {
        const mode: HeroMediaMode = (data.mediaMode as HeroMediaMode) ?? 'four_cards';
        if (mode === 'single_image' && !data.singleImage?.url) {
          setError('Selecione uma imagem para o modo "Somente imagem".');
          return;
        }
        if (mode === 'four_cards' || mode === 'cards_only') {
          const fc = data.fourCards ?? defaultHeroData.fourCards!;
          if (!fc.medium.title?.trim() || !fc.medium.text?.trim()) {
            setError('O card médio precisa de título e texto.');
            return;
          }
          const small = fc.small ?? defaultHeroData.fourCards!.small;
          if (small.some((c: { title?: string; text?: string }) => !c.title?.trim() || !c.text?.trim())) {
            setError('Todos os 3 cards pequenos precisam de título e texto.');
            return;
          }
        }
      }
      // V2 heroes are always valid (validated at block level)
    }
    if (draft.type === 'media-text') {
      const data = draft.data as MediaTextBlockData;
      const plain = (data.contentHtml || '').replace(/<[^>]+>/g, '').trim();
      if (!data.imageUrl?.trim()) {
        setError('Selecione uma imagem para o bloco imagem + texto.');
        return;
      }
      if (!plain) {
        setError('Adicione texto no bloco imagem + texto.');
        return;
      }
    }
    setError(null);
    const clampedDraft = {
      ...draft,
      colSpan: Math.max(1, Math.min(draft.colSpan ?? 1, columnCount))
    };
    onSave(clampedDraft);
  };

  return (
    <Modal
      isOpen={!!state?.open}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Editar bloco' : 'Adicionar bloco'}
      description="Selecione o tipo e configure o conteúdo."
      width={860}
    >
      {!selectedType && (
        <div className="block-type-grid">
          <button type="button" className="block-type-card" onClick={() => handleSelectType('text')}>
            <strong>Texto</strong>
            <p className="muted small">Parágrafos, listas e títulos.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('image')}>
            <strong>Imagem</strong>
            <p className="muted small">Selecione da biblioteca ou envie nova.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('button')}>
            <strong>Botão</strong>
            <p className="muted small">Links externos com estilo.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('cta')}>
            <strong>CTA</strong>
            <p className="muted small">Título, texto e botão com imagem opcional.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('media-text')}>
            <strong>Imagem + Texto</strong>
            <p className="muted small">Imagem lateral com texto na lateral.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('cards')}>
            <strong>Cards</strong>
            <p className="muted small">Grade de recursos ou serviços.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('form')}>
            <strong>Formulário</strong>
            <p className="muted small">Captura de leads e contato.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('pills')}>
            <strong>Pills</strong>
            <p className="muted small">Tags ou badges inline.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('span')}>
            <strong>Elemento</strong>
            <p className="muted small">Barra de destaque ou texto discreto.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('buttonGroup')}>
            <strong>Grupo de Botões</strong>
            <p className="muted small">Até 2 botões lado a lado.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('recent-posts')}>
            <strong>Conteúdos recentes</strong>
            <p className="muted small">Lista automática de artigos.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('services')}>
            <strong>Serviços</strong>
            <p className="muted small">Seção com ícones fixos e CTA.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('social-links')}>
            <strong>Redes Sociais</strong>
            <p className="muted small">Links para redes sociais configuradas.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('whatsapp-cta')}>
            <strong>WhatsApp</strong>
            <p className="muted small">Botão de contato via WhatsApp.</p>
          </button>
          <button type="button" className="block-type-card" onClick={() => handleSelectType('contact-info')}>
            <strong>Informações de Contato</strong>
            <p className="muted small">Bloco unificado com título, WhatsApp e redes sociais.</p>
          </button>
        </div>
      )}

      {selectedType && selectedType !== 'hero' && selectedType !== 'recent-posts' && selectedType !== 'services' && selectedType !== 'contact-info' && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="page-columns-toggle compact">
            {Array.from({ length: columnCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={(draft?.colSpan ?? 1) === idx + 1 ? 'active' : ''}
                onClick={() => setDraft((d) => (d ? { ...d, colSpan: idx + 1 } : d))}
              >
                {idx + 1} col{idx + 1 > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <small className="muted">Define quantas colunas este bloco ocupa dentro da seção.</small>
        </div>
      )}

      {selectedType === 'text' && draft && (
        <TextBlockForm
          value={draft.data as TextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'text', data }))}
          onUploadingChange={setUploading}
        />
      )}

      {selectedType === 'image' && draft && (
        <ImageBlockForm
          value={draft.data as ImageBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'image', data }))}
          onUploadingChange={setUploading}
        />
      )}

      {selectedType === 'button' && draft && (
        <ButtonBlockForm
          value={draft.data as ButtonBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'button', data }))}
        />
      )}

      {selectedType === 'cta' && draft && (
        <CtaBlockForm
          value={draft.data as CtaBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cta', data }))}
        />
      )}

      {selectedType === 'media-text' && draft && (
        <MediaTextBlockForm
          value={draft.data as MediaTextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'media-text', data }))}
          onUploadingChange={setUploading}
        />
      )}

      {selectedType === 'cards' && draft && (
        <CardBlockForm
          value={draft.data as CardBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cards', data }))}
        />
      )}

      {selectedType === 'form' && draft && (
        <FormBlockForm
          value={draft.data as FormBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'form', data }))}
        />
      )}

      {selectedType === 'hero' && draft && (
        <HeroBlockForm
          value={draft.data as HeroBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'hero', data }))}
        />
      )}

      {selectedType === 'pills' && draft && (
        <PillsBlockForm
          value={draft.data as import('../types').PillsBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'pills', data }))}
        />
      )}

      {selectedType === 'span' && draft && (
        <SpanBlockForm
          value={draft.data as import('../types').SpanBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'span', data }))}
        />
      )}

      {selectedType === 'buttonGroup' && draft && (
        <ButtonGroupBlockForm
          value={draft.data as import('../types').ButtonGroupBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'buttonGroup', data }))}
        />
      )}

      {selectedType === 'social-links' && draft && (
        <SocialLinksBlockForm
          value={draft.data as import('../types').SocialLinksBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'social-links', data }))}
        />
      )}

      {selectedType === 'whatsapp-cta' && draft && (
        <WhatsAppCtaBlockForm
          value={draft.data as import('../types').WhatsAppCtaBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'whatsapp-cta', data }))}
        />
      )}

      {selectedType === 'recent-posts' && draft && (
        <RecentPostsBlockForm
          value={draft.data as import('../types').RecentPostsBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'recent-posts', data }))}
        />
      )}

      {selectedType === 'services' && draft && (
        <ServicesBlockForm
          value={draft.data as ServicesBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'services', data }))}
        />
      )}

      {selectedType === 'contact-info' && draft && (
        <ContactInfoBlockForm
          value={draft.data as import('../types').ContactInfoBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'contact-info', data }))}
        />
      )}

      {error && <div className="admin-empty" role="alert">{error}</div>}

      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={uploading}>
          {state?.mode === 'edit' ? 'Salvar alterações' : 'Adicionar bloco'}
        </button>
      </div>
    </Modal>
  );
}

function TextBlockForm(_props: {
  value: TextBlockData;
  onChange: (value: TextBlockData) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { value, onChange, onUploadingChange } = _props;
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Conteúdo</label>
          <RichTextEditor value={value.contentHtml} onChange={(val) => onChange({ ...value, contentHtml: val })} onUploadingChange={onUploadingChange} />
        </div>
        <div className="editor-field">
          <label>Largura</label>
          <div className="page-columns-toggle compact">
            {['normal', 'wide'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={value.width === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, width: opt as TextBlockData['width'] })}
              >
                {opt === 'wide' ? 'Largo' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-field">
          <label>Fundo</label>
          <div className="page-columns-toggle compact">
            {['none', 'soft'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={value.background === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, background: opt as TextBlockData['background'] })}
              >
                {opt === 'soft' ? 'Suave' : 'Nenhum'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageBlockForm(_props: {
  value: ImageBlockData;
  onChange: (value: ImageBlockData) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { value, onChange } = _props;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const hasCropData =
    value.cropX !== null &&
    value.cropY !== null &&
    value.cropWidth !== null &&
    value.cropHeight !== null &&
    value.cropX !== undefined &&
    value.cropY !== undefined &&
    value.cropWidth !== undefined &&
    value.cropHeight !== undefined;
  const initialCropData = hasCropData
    ? {
        x: Number(value.cropX),
        y: Number(value.cropY),
        width: Number(value.cropWidth),
        height: Number(value.cropHeight),
        ratio: ((value.cropRatio as CropRatio | undefined) ?? 'free') as CropRatio,
      }
    : null;
  const initialCropRatio = initialCropData?.ratio ?? ((value.cropRatio as CropRatio | undefined) ?? 'free');

  const handleSelectImage = (image: { 
    mediaId: string; 
    src: string; 
    alt: string; 
    width?: number | null;
    height?: number | null;
    cropData?: { x: number; y: number; width: number; height: number; ratio: string } 
  }) => {
    onChange({
      ...value,
      mediaId: image.mediaId,
      src: image.src,
      alt: image.alt || value.alt,
      caption: value.caption ?? '',
      naturalWidth: image.width ?? value.naturalWidth ?? null,
      naturalHeight: image.height ?? value.naturalHeight ?? null,
      // Salvar crop data no bloco
      cropX: image.cropData?.x,
      cropY: image.cropData?.y,
      cropWidth: image.cropData?.width,
      cropHeight: image.cropData?.height,
      cropRatio: (image.cropData?.ratio as CropRatio | undefined)
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        {/* Seletor de Imagem */}
        <div className="editor-field">
          <label>Imagem</label>
          {value.src ? (
            <div className="image-selected-preview">
              <img src={value.src} alt={value.alt || ''} />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setImagePickerOpen(true)}
              >
                Trocar imagem
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setImagePickerOpen(true)}
            >
              <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
            </button>
          )}
        </div>

        <div className="editor-field">
          <label>Alt/Título</label>
          <input value={value.alt ?? ''} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
        </div>

        <div className="editor-field">
          <label>Legenda (opcional)</label>
          <input value={value.caption ?? ''} onChange={(e) => onChange({ ...value, caption: e.target.value })} />
        </div>

        <div className="editor-field">
          <label>Tamanho</label>
          <div className="page-columns-toggle compact">
            {[25, 50, 75, 100].map((size) => (
              <button
                key={size}
                type="button"
                className={value.size === size ? 'active' : ''}
                onClick={() => onChange({ ...value, size: size as ImageBlockData['size'] })}
              >
                {size}%
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Alinhamento</label>
          <div className="page-columns-toggle compact">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                type="button"
                className={value.align === align ? 'active' : ''}
                onClick={() => onChange({ ...value, align: align as ImageBlockData['align'] })}
              >
                {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Altura no Hero (%)</label>
          <small className="muted">Define a altura da imagem como porcentagem da altura máxima do Hero (apenas para Hero V2)</small>
          <div className="page-columns-toggle compact">
            {[40, 60, 80, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className={(value.heightPct ?? 100) === pct ? 'active' : ''}
                onClick={() => onChange({ ...value, heightPct: pct })}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Imagem */}
      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={handleSelectImage}
        currentMediaId={value.mediaId}
        enableCrop={true}
        cropRatio={initialCropRatio}
        initialCropData={initialCropData}
        cropTitle="Recortar Imagem do Bloco"
      />
    </div>
  );
}

function ButtonBlockForm(_props: { value: ButtonBlockData; onChange: (value: ButtonBlockData) => void }) {
  const { value, onChange } = _props;
  const linkValue: LinkPickerValue = {
    mode: (value.linkMode as any) ?? 'manual',
    href: value.href ?? '',
    pageKey: value.pageKey ?? null,
    pageId: value.pageId ?? null,
    slug: value.slug ?? null
  };
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Ex: Agendar sessão" />
        </div>
        <div className="editor-field">
          <LinkPicker
            label="Destino"
            value={linkValue}
            onChange={(val) =>
              onChange({
                ...value,
                href: val.href,
                linkMode: val.mode,
                pageKey: val.pageKey ?? null,
                pageId: val.pageId ?? null,
                slug: val.slug ?? null
              })
            }
          />
        </div>
        <div className="editor-field">
          <label>Estilo</label>
          <select value={value.variant ?? 'primary'} onChange={(e) => onChange({ ...value, variant: e.target.value as ButtonBlockData['variant'] })}>
            <option value="primary">Primário</option>
            <option value="secondary">Secundário</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div className="editor-field">
          <Switch checked={value.newTab ?? false} onChange={(val) => onChange({ ...value, newTab: val })} label="Abrir em nova aba" />
        </div>
        <div className="editor-field">
          <label>Ícone (opcional)</label>
          <input value={value.icon ?? ''} onChange={(e) => onChange({ ...value, icon: e.target.value })} placeholder="Ex: →" />
        </div>
      </div>
    </div>
  );
}

function CtaBlockForm(_props: { value: CtaBlockData; onChange: (value: CtaBlockData) => void }) {
  const { value, onChange } = _props;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const linkValue: LinkPickerValue = {
    mode: (value.ctaLinkMode as any) ?? 'page',
    href: value.ctaHref ?? '',
    pageKey: value.ctaPageKey ?? null,
    pageId: value.ctaPageId ?? null,
    slug: value.ctaSlug ?? null
  };

  const handleSelectImage = (image: { mediaId: string; src: string; alt: string }) => {
    onChange({
      ...value,
      imageId: image.mediaId,
      imageUrl: image.src,
      imageAlt: image.alt || value.imageAlt || ''
    });
  };

  const handleRemoveImage = () => {
    onChange({
      ...value,
      imageId: null,
      imageUrl: null
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título</label>
          <input value={value.title ?? ''} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
        <div className="editor-field">
          <label>Texto</label>
          <textarea
            rows={3}
            value={value.text ?? ''}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
          />
        </div>
        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.ctaLabel ?? ''} onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })} />
        </div>
        <div className="editor-field">
          <LinkPicker
            label="Destino do botão"
            value={linkValue}
            onChange={(val) =>
              onChange({
                ...value,
                ctaHref: val.href,
                ctaLinkMode: val.mode,
                ctaPageKey: val.pageKey ?? null,
                ctaPageId: val.pageId ?? null,
                ctaSlug: val.slug ?? null
              })
            }
          />
        </div>

        <div className="editor-field">
          <label>Imagem (opcional)</label>
          {value.imageUrl ? (
            <div className="image-selected-preview">
              <img src={value.imageUrl} alt={value.imageAlt || ''} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setImagePickerOpen(true)}>
                  Trocar imagem
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveImage}>
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setImagePickerOpen(true)}>
              <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
            </button>
          )}
        </div>

        <div className="editor-field">
          <label>URL da imagem (opcional)</label>
          <input
            value={value.imageUrl ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                imageUrl: e.target.value,
                imageId: null
              })
            }
            placeholder="https://..."
          />
        </div>

        <div className="editor-field">
          <label>Alt da imagem</label>
          <input value={value.imageAlt ?? ''} onChange={(e) => onChange({ ...value, imageAlt: e.target.value })} />
        </div>
      </div>

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt })}
        currentMediaId={value.imageId ?? undefined}
      />
    </div>
  );
}

function MediaTextBlockForm(_props: {
  value: MediaTextBlockData;
  onChange: (value: MediaTextBlockData) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { value, onChange, onUploadingChange } = _props;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const side = value.imageSide === 'right' ? 'right' : 'left';
  const imageWidth = ([25, 50, 75, 100] as const).includes((value.imageWidth as any) ?? 50)
    ? (value.imageWidth as 25 | 50 | 75 | 100)
    : 50;
  const imageHeight = ([25, 50, 75, 100] as const).includes((value.imageHeight as any) ?? 75)
    ? (value.imageHeight as 25 | 50 | 75 | 100)
    : 75;

  const handleSelectImage = (image: { mediaId: string; src: string; alt: string }) => {
    onChange({
      ...value,
      imageId: image.mediaId,
      imageUrl: image.src,
      imageAlt: image.alt || value.imageAlt || ''
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto</label>
          <RichTextEditor
            value={value.contentHtml || ''}
            onChange={(contentHtml) => onChange({ ...value, contentHtml })}
            onUploadingChange={onUploadingChange}
          />
        </div>

        <div className="editor-field">
          <label>Lado da imagem</label>
          <div className="page-columns-toggle compact">
            <button
              type="button"
              className={side === 'left' ? 'active' : ''}
              onClick={() => onChange({ ...value, imageSide: 'left' })}
            >
              Esquerda
            </button>
            <button
              type="button"
              className={side === 'right' ? 'active' : ''}
              onClick={() => onChange({ ...value, imageSide: 'right' })}
            >
              Direita
            </button>
          </div>
        </div>

        <div className="editor-field">
          <label>Largura da imagem</label>
          <div className="page-columns-toggle compact">
            {[25, 50, 75, 100].map((opt) => (
              <button
                key={`media-width-${opt}`}
                type="button"
                className={imageWidth === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, imageWidth: opt as 25 | 50 | 75 | 100 })}
              >
                {opt}%
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Altura da imagem</label>
          <div className="page-columns-toggle compact">
            {[25, 50, 75, 100].map((opt) => (
              <button
                key={`media-height-${opt}`}
                type="button"
                className={imageHeight === opt ? 'active' : ''}
                onClick={() => onChange({ ...value, imageHeight: opt as 25 | 50 | 75 | 100 })}
              >
                {opt}%
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Imagem</label>
          {value.imageUrl ? (
            <div className="image-selected-preview">
              <img src={value.imageUrl} alt={value.imageAlt || ''} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setImagePickerOpen(true)}>
                  Trocar imagem
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onChange({ ...value, imageId: null, imageUrl: '', imageAlt: '' })}
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setImagePickerOpen(true)}>
              <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
            </button>
          )}
        </div>

        <div className="editor-field">
          <label>Alt da imagem</label>
          <input value={value.imageAlt ?? ''} onChange={(e) => onChange({ ...value, imageAlt: e.target.value })} />
        </div>
      </div>

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt })}
        currentMediaId={value.imageId ?? undefined}
      />
    </div>
  );
}

function CardBlockForm(_props: { value: CardBlockData; onChange: (value: CardBlockData) => void }) {
  const { value, onChange } = _props;
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconTargetId, setIconTargetId] = useState<string | null>(null);

  const handleAddCard = () => {
    const newCard: CardItem = {
      id: uuidv4(),
      icon: '*',
      iconType: 'emoji',
      iconImageUrl: null,
      iconImageId: null,
      iconAlt: null,
      title: 'Novo Card',
      text: 'Descricao do card',
      ctaLabel: null,
      ctaHref: null
    };
    onChange({ ...value, items: [...value.items, newCard] });
  };

  const handleRemoveCard = (id: string) => {
    onChange({ ...value, items: value.items.filter((c) => c.id !== id) });
  };

  const handleUpdateCard = (id: string, updates: Partial<typeof value.items[0]>) => {
    onChange({
      ...value,
      items: value.items.map((c) => (c.id === id ? { ...c, ...updates } : c))
    });
  };

  const handleSelectIconImage = (image: { mediaId: string; src: string; alt: string }) => {
    if (!iconTargetId) return;
    handleUpdateCard(iconTargetId, {
      iconType: 'image',
      iconImageUrl: image.src,
      iconImageId: image.mediaId,
      iconAlt: image.alt || null
    });
    setIconPickerOpen(false);
    setIconTargetId(null);
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título (opcional)</label>
          <input value={value.title ?? ''} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Ex: Nossos Serviços" />
        </div>
        <div className="editor-field">
          <label>Subtítulo (opcional)</label>
          <input value={value.subtitle ?? ''} onChange={(e) => onChange({ ...value, subtitle: e.target.value })} placeholder="Texto descritivo" />
        </div>

        <div className="editor-field">
          <label>Layout</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'auto', label: 'Auto' },
              { value: '2', label: '2 cols' },
              { value: '3', label: '3 cols' },
              { value: '4', label: '4 cols' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={value.layout === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, layout: opt.value as CardBlockData['layout'] })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Variante</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'feature', label: 'Feature' },
              { value: 'simple', label: 'Simples' },
              { value: 'borderless', label: 'Sem borda' },
              { value: 'earthy', label: 'Terroso' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={value.variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as CardBlockData['variant'] })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Cards ({value.items.length})</label>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddCard}>
              + Adicionar Card
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.items.map((card, idx) => (
              <div key={card.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Card {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveCard(card.id)}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Icone
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {[
                        { value: 'emoji', label: 'Emoji' },
                        { value: 'image', label: 'PNG' }
                      ].map((opt) => {
                        const resolvedType = card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji');
                        const isActive = resolvedType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() =>
                              handleUpdateCard(card.id, {
                                iconType: opt.value as 'emoji' | 'image'
                              })
                            }
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {((card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji')) === 'emoji') && (
                      <input
                        value={card.icon ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { icon: e.target.value })}
                        placeholder="Ex: ?"
                        style={{ width: '100%' }}
                      />
                    )}

                    {((card.iconType ?? (card.iconImageUrl ? 'image' : 'emoji')) === 'image') && (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {card.iconImageUrl ? (
                          <div className="image-selected-preview">
                            <img src={card.iconImageUrl} alt={card.iconAlt ?? ''} />
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setIconTargetId(card.id);
                                  setIconPickerOpen(true);
                                }}
                              >
                                Trocar imagem
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleUpdateCard(card.id, { iconImageUrl: null, iconImageId: null })}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setIconTargetId(card.id);
                              setIconPickerOpen(true);
                            }}
                          >
                            <FontAwesomeIcon icon={faCamera} /> Selecionar imagem
                          </button>
                        )}

                        <input
                          value={card.iconImageUrl ?? ''}
                          onChange={(e) =>
                            handleUpdateCard(card.id, {
                              iconImageUrl: e.target.value,
                              iconImageId: null
                            })
                          }
                          placeholder="URL da imagem (PNG/WebP)"
                          style={{ width: '100%' }}
                        />

                        <input
                          value={card.iconAlt ?? ''}
                          onChange={(e) => handleUpdateCard(card.id, { iconAlt: e.target.value })}
                          placeholder="Alt (opcional)"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Título *
                    </label>
                    <input
                      value={card.title}
                      onChange={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                      placeholder="Ex: Rápido"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Texto *
                    </label>
                    <textarea
                      value={card.text}
                      onChange={(e) => handleUpdateCard(card.id, { text: e.target.value })}
                      placeholder="Descrição do card"
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        CTA Texto (opcional)
                      </label>
                      <input
                        value={card.ctaLabel ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { ctaLabel: e.target.value })}
                        placeholder="Ex: Saiba mais"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        CTA URL (opcional)
                      </label>
                      <input
                        value={card.ctaHref ?? ''}
                        onChange={(e) => handleUpdateCard(card.id, { ctaHref: e.target.value })}
                        placeholder="https://..."
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ImagePickerModal
        open={iconPickerOpen}
        onClose={() => {
          setIconPickerOpen(false);
          setIconTargetId(null);
        }}
        onSelect={(img) => handleSelectIconImage({ mediaId: img.mediaId, src: img.src, alt: img.alt })}
        currentMediaId={
          iconTargetId
            ? value.items.find((item) => item.id === iconTargetId)?.iconImageId ?? undefined
            : undefined
        }
      />
    </div>
  );
}

function FormBlockForm(_props: { value: FormBlockData; onChange: (value: FormBlockData) => void }) {
  const { value, onChange } = _props;

  const handleAddField = () => {
    const newField = {
      id: uuidv4(),
      type: 'text' as const,
      label: 'Novo Campo',
      placeholder: null,
      required: false,
      options: null
    };
    onChange({ ...value, fields: [...value.fields, newField] });
  };

  const handleRemoveField = (id: string) => {
    onChange({ ...value, fields: value.fields.filter((f) => f.id !== id) });
  };

  const handleUpdateField = (id: string, updates: Partial<typeof value.fields[0]>) => {
    onChange({
      ...value,
      fields: value.fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título do formulário (opcional)</label>
          <input value={value.title ?? ''} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Ex: Entre em contato" />
        </div>
        <div className="editor-field">
          <label>Descrição (opcional)</label>
          <input value={value.description ?? ''} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Texto descritivo" />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Campos ({value.fields.length})</label>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddField}>
              + Adicionar Campo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.fields.map((field, idx) => (
              <div key={field.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Campo {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveField(field.id)}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Remover
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Tipo de campo
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                      style={{ width: '100%' }}
                    >
                      <option value="text">Texto</option>
                      <option value="email">Email</option>
                      <option value="tel">Telefone</option>
                      <option value="textarea">Texto longo</option>
                      <option value="select">Seleção</option>
                    </select>
                  </div>

                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Obrigatório?
                    </label>
                    <Switch
                      checked={field.required}
                      onChange={(val) => handleUpdateField(field.id, { required: val })}
                      label=""
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Rótulo *
                    </label>
                    <input
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="Ex: Nome completo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Placeholder (opcional)
                    </label>
                    <input
                      value={field.placeholder ?? ''}
                      onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                      placeholder="Texto de exemplo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {field.type === 'select' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        Opções (uma por linha)
                      </label>
                      <textarea
                        value={(field.options ?? []).join('\n')}
                        onChange={(e) =>
                          handleUpdateField(field.id, {
                            options: e.target.value.split('\n').filter((o) => o.trim())
                          })
                        }
                        placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Texto do botão</label>
          <input value={value.submitLabel ?? 'Enviar'} onChange={(e) => onChange({ ...value, submitLabel: e.target.value })} />
        </div>

        <div className="editor-field">
          <label>Mensagem de sucesso</label>
          <input
            value={value.successMessage ?? 'Mensagem enviada!'}
            onChange={(e) => onChange({ ...value, successMessage: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ================= SECTION PRESET MODAL =================
interface SectionPresetModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onAddBlank: () => void;
  sections: PageSection[];
}

function SectionPresetModal({ open, onClose, onSelectPreset, onAddBlank, sections }: SectionPresetModalProps) {
  if (!open) return null;

  // Verificar se já existe uma seção Hero
  const hasHeroSection = sections.some((s) => s.kind === 'hero');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 'min(1100px, 95vw)', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Escolha um Preset de Seção</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
            className="preset-grid"
          >
            {sectionPresets.map((preset) => {
              // Desabilitar preset Hero se já existir uma seção Hero
              const isHeroPreset = preset.id === 'hero-2col' || preset.id === 'hero-stacked';
              const isDisabled = isHeroPreset && hasHeroSection;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => !isDisabled && onSelectPreset(preset.id)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    background: isDisabled ? '#f9fafb' : 'white',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>{preset.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>
                    {preset.name}
                    {isDisabled && ' (já existe)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{preset.description}</div>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onAddBlank}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#6b7280',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              + Seção em Branco (sem blocos)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= BLOCK LIST EDITOR (NESTED BUILDER) =================
type NestedBlockModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  block?: PageBlock;
};

interface BlockListEditorProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  allowedTypes?: PageBlock['type'][];
  emptyMessage?: string;
}

function BlockListEditor({ blocks, onChange, allowedTypes, emptyMessage = 'Nenhum bloco ainda. Clique em "Adicionar bloco" para começar.' }: BlockListEditorProps) {
  const [blockModal, setBlockModal] = useState<NestedBlockModalState | null>(null);
  
  const handleAddBlock = () => {
    setBlockModal({ open: true, mode: 'add' });
  };

  const handleEditBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      setBlockModal({ open: true, mode: 'edit', block });
    }
  };

  const handleSaveBlock = (draft: BlockDraft) => {
    if (blockModal?.mode === 'add') {
      const newBlock: PageBlock = {
        id: uuidv4(),
        type: draft.type,
        data: draft.data,
        colSpan: draft.colSpan ?? 1,
        rowIndex: blocks.length
      } as PageBlock;
      onChange([...blocks, newBlock]);
    } else if (blockModal?.mode === 'edit' && blockModal.block) {
      const updated = blocks.map((b) =>
        b.id === blockModal.block!.id
          ? { ...b, type: draft.type, data: draft.data, colSpan: draft.colSpan ?? 1 }
          : b
      ) as PageBlock[];
      onChange(updated);
    }
    setBlockModal(null);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (confirm('Remover este bloco?')) {
      onChange(blocks.filter((b) => b.id !== blockId));
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      const duplicate: PageBlock = { ...block, id: uuidv4() } as PageBlock;
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, duplicate);
      onChange(newBlocks);
    }
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {blocks.length === 0 && (
        <div className="admin-empty">
          <p className="muted">{emptyMessage}</p>
        </div>
      )}
      
      {blocks.map((block, idx) => (
        <div key={block.id} className="page-block-card admin-card">
          <div className="page-block-card-header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {block.type === 'text' ? 'Texto' : 
                 block.type === 'image' ? 'Imagem' : 
                 block.type === 'button' ? 'Botão' : 
                 block.type === 'cta' ? 'CTA' :
                 block.type === 'media-text' ? 'Imagem + Texto' :
                 block.type === 'pills' ? 'Pills' : 
                 block.type === 'span' ? 'Elemento' :
                 block.type === 'buttonGroup' ? 'Grupo de Botões' :
                 block.type === 'social-links' ? 'Redes Sociais' :
                 block.type === 'whatsapp-cta' ? 'WhatsApp' :
                 block.type === 'cards' ? 'Cards' :
                 block.type === 'services' ? 'Serviços' : block.type}
              </p>
            </div>
            <div className="admin-actions" style={{ gap: '0.35rem' }}>
              <IconButton 
                icon="arrow-up" 
                label="Mover para cima" 
                onClick={() => handleMoveBlock(block.id, 'up')} 
                disabled={idx === 0} 
              />
              <IconButton 
                icon="arrow-down" 
                label="Mover para baixo" 
                onClick={() => handleMoveBlock(block.id, 'down')} 
                disabled={idx === blocks.length - 1} 
              />
              <IconButton icon="edit" label="Editar" tone="info" onClick={() => handleEditBlock(block.id)} />
              <IconButton icon="copy" label="Duplicar" onClick={() => handleDuplicateBlock(block.id)} />
              <IconButton icon="trash" label="Remover" tone="danger" onClick={() => handleDeleteBlock(block.id)} />
            </div>
          </div>
          <div className="page-block-card-body">
            <PageBlockView block={block} />
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={handleAddBlock}
        className="btn btn-outline"
        style={{ marginTop: blocks.length > 0 ? '0.5rem' : 0 }}
      >
        + Adicionar bloco
      </button>

      <NestedBlockEditorModal
        state={blockModal}
        onClose={() => setBlockModal(null)}
        onSave={handleSaveBlock}
        allowedTypes={allowedTypes}
      />
    </div>
  );
}

// ================= NESTED BLOCK EDITOR MODAL =================
interface NestedBlockEditorModalProps {
  state: NestedBlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  allowedTypes?: PageBlock['type'][];
}

function NestedBlockEditorModal({ state, onClose, onSave, allowedTypes }: NestedBlockEditorModalProps) {
  const initialDraft = toBlockDraft(state?.block);
  const [draft, setDraft] = useState<BlockDraft | null>(initialDraft);
  const [selectedType, setSelectedType] = useState<PageBlock['type'] | null>(initialDraft?.type ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setSelectedType(initialDraft?.type ?? null);
    setError(null);
  }, [state?.block?.id, state?.open]);

  const handleSelectType = (type: PageBlock['type']) => {
    setSelectedType(type);
    if (!draft || draft.type !== type) {
      const defaults: BlockDraft['data'] = 
        type === 'text' ? defaultTextData : 
        type === 'image' ? defaultImageData : 
        type === 'button' ? defaultButtonData : 
        type === 'cta' ? defaultCtaData :
        type === 'media-text' ? defaultMediaTextData :
        type === 'cards' ? defaultCardData : 
        type === 'pills' ? defaultPillsData :
        type === 'span' ? defaultSpanData :
        type === 'buttonGroup' ? defaultButtonGroupData :
        defaultTextData;
      setDraft({ type, data: defaults, colSpan: 1 });
    }
  };

  const handleSave = () => {
    if (!draft || !selectedType) {
      setError('Escolha um tipo de bloco.');
      return;
    }
    setError(null);
    onSave(draft);
  };

  const availableTypes = allowedTypes || ['text', 'image', 'button', 'cta', 'media-text', 'cards', 'pills', 'span', 'buttonGroup', 'social-links', 'whatsapp-cta'];

  return (
    <Modal
      isOpen={!!state?.open}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Editar bloco' : 'Adicionar bloco'}
      description="Configure o conteúdo do bloco."
      width={860}
    >
      {!selectedType && (
        <div className="block-type-grid">
          {availableTypes.includes('text') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('text')}>
              <strong>Texto</strong>
              <p className="muted small">Parágrafos, listas e títulos.</p>
            </button>
          )}
          {availableTypes.includes('image') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('image')}>
              <strong>Imagem</strong>
              <p className="muted small">Imagem ou foto.</p>
            </button>
          )}
          {availableTypes.includes('button') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('button')}>
              <strong>Botão</strong>
              <p className="muted small">Link com estilo.</p>
            </button>
          )}
          {availableTypes.includes('cta') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('cta')}>
              <strong>CTA</strong>
              <p className="muted small">Título, texto e botão com imagem.</p>
            </button>
          )}
          {availableTypes.includes('media-text') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('media-text')}>
              <strong>Imagem + Texto</strong>
              <p className="muted small">Imagem lateral com texto na lateral.</p>
            </button>
          )}
          {availableTypes.includes('cards') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('cards')}>
              <strong>Cards</strong>
              <p className="muted small">Grade de recursos.</p>
            </button>
          )}
          {availableTypes.includes('pills') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('pills')}>
              <strong>Pills</strong>
              <p className="muted small">Tags inline.</p>
            </button>
          )}
          {availableTypes.includes('span') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('span')}>
              <strong>Elemento</strong>
              <p className="muted small">Barra ou texto.</p>
            </button>
          )}
          {availableTypes.includes('buttonGroup') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('buttonGroup')}>
              <strong>Grupo de Botões</strong>
              <p className="muted small">Até 2 botões lado a lado.</p>
            </button>
          )}
          {availableTypes.includes('social-links') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('social-links')}>
              <strong>Redes Sociais</strong>
              <p className="muted small">Links para redes sociais configuradas.</p>
            </button>
          )}
          {availableTypes.includes('whatsapp-cta') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('whatsapp-cta')}>
              <strong>WhatsApp</strong>
              <p className="muted small">Botão de contato via WhatsApp.</p>
            </button>
          )}
        </div>
      )}

      {selectedType === 'text' && draft && (
        <TextBlockForm
          value={draft.data as TextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'text', data }))}
          onUploadingChange={() => {}}
        />
      )}

      {selectedType === 'image' && draft && (
        <ImageBlockForm
          value={draft.data as ImageBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'image', data }))}
          onUploadingChange={() => {}}
        />
      )}

      {selectedType === 'button' && draft && (
        <ButtonBlockForm
          value={draft.data as ButtonBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'button', data }))}
        />
      )}

      {selectedType === 'cta' && draft && (
        <CtaBlockForm
          value={draft.data as CtaBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cta', data }))}
        />
      )}

      {selectedType === 'media-text' && draft && (
        <MediaTextBlockForm
          value={draft.data as MediaTextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'media-text', data }))}
          onUploadingChange={() => {}}
        />
      )}

      {selectedType === 'cards' && draft && (
        <CardBlockForm
          value={draft.data as CardBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cards', data }))}
        />
      )}

      {selectedType === 'pills' && draft && (
        <PillsBlockForm
          value={draft.data as import('../types').PillsBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'pills', data }))}
        />
      )}

      {selectedType === 'span' && draft && (
        <SpanBlockForm
          value={draft.data as import('../types').SpanBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'span', data }))}
        />
      )}

      {selectedType === 'buttonGroup' && draft && (
        <ButtonGroupBlockForm
          value={draft.data as import('../types').ButtonGroupBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'buttonGroup', data }))}
        />
      )}

      {error && <div className="admin-empty" role="alert">{error}</div>}

      <div className="admin-modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          {state?.mode === 'edit' ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </Modal>
  );
}

// ================= HERO V2 EDITOR =================
interface HeroV2EditorProps {
  value: import('../types').HeroBlockDataV2;
  onChange: (value: import('../types').HeroBlockDataV2) => void;
}

function HeroV2Editor({ value, onChange }: HeroV2EditorProps) {
  const layoutVariant = value.layoutVariant ?? 'split';
  const imageHeight = value.imageHeight ?? 'lg';

  const handleLayoutChange = (variant: 'split' | 'stacked') => {
    if (variant === layoutVariant) return;
    let nextRight = [...value.right];
    let nextRightVariant = value.rightVariant;

    if (variant === 'stacked') {
      const existingImage = nextRight.find((b) => b.type === 'image');
      nextRight = existingImage ? [existingImage] : [];
      nextRightVariant = 'image-only';
    }

    onChange({ ...value, layoutVariant: variant, rightVariant: nextRightVariant, right: nextRight });
  };

  const handleVariantChange = (variant: 'image-only' | 'cards-only' | 'cards-with-image') => {
    let newRight = [...value.right];

    // Normalizar estrutura conforme variante
    if (variant === 'image-only') {
      // Manter apenas 1 imagem (primeira image encontrada ou criar nova)
      const existingImage = newRight.find((b) => b.type === 'image');
      newRight = existingImage ? [existingImage] : [];
    } else if (variant === 'cards-only') {
      // 4 cards
      const existingCards = newRight.filter((b) => b.type === 'cards') as Array<PageBlock & { type: 'cards'; data: CardBlockData }>;
      while (existingCards.length < 4) {
        const newCard = {
          id: uuidv4(),
          type: 'cards' as const,
          data: defaultCardData,
          colSpan: 1
        };
        existingCards.push(newCard);
      }
      newRight = existingCards.slice(0, 4);
    } else {
      // cards-with-image: 1 imagem + 4 cards
      const existingImage = newRight.find((b) => b.type === 'image');
      const existingCards = newRight.filter((b) => b.type === 'cards') as Array<PageBlock & { type: 'cards'; data: CardBlockData }>;
      while (existingCards.length < 4) {
        const newCard = {
          id: uuidv4(),
          type: 'cards' as const,
          data: defaultCardData,
          colSpan: 1
        };
        existingCards.push(newCard);
      }
      newRight = existingImage
        ? [existingImage, ...existingCards.slice(0, 4)]
        : [...existingCards.slice(0, 4)];
    }

    onChange({ ...value, rightVariant: variant, right: newRight });
  };

  const allowedLeftTypes: PageBlock['type'][] = ['text', 'pills', 'span', 'buttonGroup'];
  const allowedRightTypes: PageBlock['type'][] =
    layoutVariant === 'stacked'
      ? ['image']
      : value.rightVariant === 'image-only'
        ? ['image']
        : value.rightVariant === 'cards-only'
          ? ['cards']
          : ['image', 'cards'];

  return (
    <div className="page-block-form">
      <div className="editor-field">
        <label>Layout</label>
        <div className="page-columns-toggle">
          <button
            type="button"
            className={layoutVariant === 'split' ? 'active' : ''}
            onClick={() => handleLayoutChange('split')}
          >
            Imagem ao lado
          </button>
          <button
            type="button"
            className={layoutVariant === 'stacked' ? 'active' : ''}
            onClick={() => handleLayoutChange('stacked')}
          >
            Imagem em cima
          </button>
        </div>
      </div>

      {layoutVariant === 'split' && (
        <div className="editor-field">
          <label>Variante da coluna direita</label>
          <div className="page-columns-toggle">
            <button
              type="button"
              className={value.rightVariant === 'image-only' ? 'active' : ''}
              onClick={() => handleVariantChange('image-only')}
            >
              Somente imagem
            </button>
            <button
              type="button"
              className={value.rightVariant === 'cards-only' ? 'active' : ''}
              onClick={() => handleVariantChange('cards-only')}
            >
              Cards (1 grande + 3 pequenos)
            </button>
            <button
              type="button"
              className={value.rightVariant === 'cards-with-image' ? 'active' : ''}
              onClick={() => handleVariantChange('cards-with-image')}
            >
              Cards com imagem
            </button>
          </div>
        </div>
      )}

      <div className="editor-field">
        <label>Altura da imagem</label>
        <div className="page-columns-toggle compact">
          {['sm', 'md', 'lg', 'xl'].map((size) => (
            <button
              key={size}
              type="button"
              className={imageHeight === size ? 'active' : ''}
              onClick={() => onChange({ ...value, imageHeight: size as 'sm' | 'md' | 'lg' | 'xl' })}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label className="small">Personalizada (px)</label>
          <input
            type="number"
            min={120}
            max={2000}
            value={typeof imageHeight === 'number' ? imageHeight : ''}
            placeholder="Ex: 480"
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next) && next > 0) {
                onChange({ ...value, imageHeight: next });
              }
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
            Coluna Esquerda
          </h4>
          <small className="muted" style={{ display: 'block', marginBottom: '1rem' }}>
            Blocos permitidos: Texto, Pills, Elemento, Grupo de Botões
          </small>
          <BlockListEditor
            blocks={value.left}
            onChange={(left) => onChange({ ...value, left })}
            allowedTypes={allowedLeftTypes}
            emptyMessage="Adicione blocos de texto, pills, etc."
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
            Coluna Direita
          </h4>
          <small className="muted" style={{ display: 'block', marginBottom: '1rem' }}>
            {layoutVariant === 'stacked' && 'Apenas 1 imagem (full-width)'}
            {layoutVariant === 'split' && value.rightVariant === 'image-only' && 'Apenas 1 imagem permitida'}
            {layoutVariant === 'split' && value.rightVariant === 'cards-only' && 'Exatamente 4 cards'}
            {layoutVariant === 'split' && value.rightVariant === 'cards-with-image' && '1 imagem + at?? 4 cards'}
          </small>
          <BlockListEditor
            blocks={value.right}
            onChange={(right) => onChange({ ...value, right })}
            allowedTypes={allowedRightTypes}
            emptyMessage={layoutVariant === 'stacked' ? 'Adicione a imagem do hero.' : 'Adicione imagem ou cards conforme variante.'}
          />
        </div>
      </div>
    </div>
  );
}

function HeroBlockForm(_props: { value: HeroBlockData; onChange: (value: HeroBlockData) => void }) {
  const { value, onChange } = _props;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<{ type: 'singleImage' | 'medium' | 'small'; index?: number } | null>(null);

  // Tratar Hero V2 (bloco composto)
  if (isHeroV2(value)) {
    return (
      <HeroV2Editor
        value={value}
        onChange={onChange}
      />
    );
  }

  // Hero V1 (editor legado) - garantir type safety
  if (!isHeroV1(value)) {
    return (
      <div className="page-block-form">
        <p className="muted">Formato de Hero desconhecido. Por favor, recrie o bloco.</p>
      </div>
    );
  }

  // A partir daqui, value é garantidamente HeroBlockDataV1
  const valueV1 = value;
  const badges = Array.isArray(valueV1.badges) ? valueV1.badges : [];
  const mediaMode: HeroMediaMode = (valueV1.mediaMode as HeroMediaMode) ?? 'four_cards';
  const fourCards = valueV1.fourCards ?? defaultHeroData.fourCards!;

  const updateBadge = (index: number, text: string) => {
    const next = [...badges];
    next[index] = text;
    onChange({ ...valueV1, badges: next });
  };

  const removeBadge = (index: number) => {
    const next = badges.filter((_: string, i: number) => i !== index);
    onChange({ ...valueV1, badges: next });
  };

  const addBadge = () => {
    onChange({ ...value, badges: [...badges, 'Nova badge'] });
  };

  const ensureSmall = (): HeroCard[] => {
    const base = fourCards.small ?? defaultHeroData.fourCards!.small;
    return Array.from({ length: 3 }).map((_, i) => base?.[i] ?? defaultHeroData.fourCards!.small[i]);
  };

  const handleSelectImage = (image: { mediaId: string; src: string; alt: string }) => {
    if (!imageTarget) return;
    if (imageTarget.type === 'singleImage') {
      onChange({
        ...value,
        singleImage: { imageId: image.mediaId, url: image.src, alt: image.alt }
      });
    } else if (imageTarget.type === 'medium') {
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          medium: { ...fourCards.medium, imageId: image.mediaId, url: image.src, alt: image.alt }
        }
      });
    } else if (imageTarget.type === 'small') {
      const next = ensureSmall();
      if (imageTarget.index !== undefined) {
        next[imageTarget.index] = { ...next[imageTarget.index], imageId: image.mediaId, url: image.src, alt: image.alt };
      }
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          small: next
        }
      });
    }
    setImagePickerOpen(false);
    setImageTarget(null);
  };

  const renderSingleImage = () => (
    <div className="editor-field">
      <label>Imagem de capa</label>
      {value.singleImage?.url ? (
        <div className="image-selected-preview">
          <img src={value.singleImage.url} alt={value.singleImage.alt ?? ''} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={value.singleImage.alt ?? ''}
              onChange={(e) => onChange({ ...value, singleImage: { ...(value.singleImage ?? {}), alt: e.target.value } })}
              placeholder="Texto alternativo"
            />
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setImagePickerOpen(true);
                setImageTarget({ type: 'singleImage' });
              }}
            >
              Trocar imagem
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onChange({ ...value, singleImage: null })}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            setImageTarget({ type: 'singleImage' });
            setImagePickerOpen(true);
          }}
        >
          Selecionar imagem
        </button>
      )}
    </div>
  );

  const renderCardEditor = (card: HeroCard, onUpdate: (next: HeroCard) => void, label: string, allowImages = true) => (
    <div className="admin-card" style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
      <strong>{label}</strong>
      <input
        className="form-control"
        value={card.title}
        onChange={(e) => onUpdate({ ...card, title: e.target.value })}
        placeholder="Título"
      />
      <textarea
        className="form-control"
        rows={2}
        value={card.text}
        onChange={(e) => onUpdate({ ...card, text: e.target.value })}
        placeholder="Texto"
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-control"
          style={{ flex: 1, minWidth: '140px' }}
          value={card.icon ?? ''}
          onChange={(e) => onUpdate({ ...card, icon: e.target.value })}
          placeholder="Emoji/ícone (opcional)"
        />
        {allowImages && (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setImageTarget({ type: label === 'Card médio' ? 'medium' : 'small', index: label.startsWith('Pequeno') ? Number(label.slice(-1)) - 1 : undefined });
                setImagePickerOpen(true);
              }}
            >
              {card.url ? 'Trocar imagem' : 'Adicionar imagem'}
            </button>
            {card.url && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...card, url: null, imageId: null, alt: null })}>
                Remover imagem
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderFourCards = () => {
    const smallCards = ensureSmall();
    return (
      <div className="editor-field" style={{ display: 'grid', gap: '0.75rem' }}>
        <label>Grid de 4 cards</label>
        {renderCardEditor(
          fourCards.medium,
          (next) => onChange({ ...value, fourCards: { ...fourCards, medium: next } }),
          'Card médio',
          mediaMode === 'four_cards'
        )}
        {smallCards.map((card, idx) =>
          renderCardEditor(
            card,
            (next) => {
              const list = ensureSmall();
              list[idx] = next;
              onChange({ ...value, fourCards: { ...fourCards, small: list } });
            },
            `Pequeno ${idx + 1}`,
            mediaMode === 'four_cards'
          )
        )}
      </div>
    );
  };

  const linkValueFrom = (
    href?: string | null,
    mode?: 'page' | 'manual' | null,
    pageKey?: string | null,
    pageId?: string | null,
    slug?: string | null
  ): LinkPickerValue => ({
    mode: (mode as 'page' | 'manual') ?? 'manual',
    href: href ?? '',
    pageKey: pageKey ?? null,
    pageId: pageId ?? null,
    slug: slug ?? null
  });

  const handleModeChange = (mode: HeroMediaMode) => {
    const next: HeroBlockData = { ...value, mediaMode: mode };
    if ((mode === 'four_cards' || mode === 'cards_only') && !value.fourCards) {
      next.fourCards = defaultHeroData.fourCards;
    }
    if (mode === 'single_image' && value.singleImage === undefined) {
      next.singleImage = null;
    }
    onChange(next);
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título Principal</label>
          <input
            type="text"
            className="form-control"
            value={value.heading ?? ''}
            onChange={(e) => onChange({ ...value, heading: e.target.value })}
            placeholder="Psicologia para vidas com mais sentido"
          />
        </div>

        <div className="editor-field">
          <label>Subtítulo</label>
          <textarea
            className="form-control"
            value={value.subheading ?? ''}
            onChange={(e) => onChange({ ...value, subheading: e.target.value })}
            rows={2}
            placeholder="Caminhadas terapêuticas..."
          />
        </div>

        <div className="editor-field">
          <label>Badges</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {badges.map((badge, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  value={badge}
                  onChange={(e) => updateBadge(index, e.target.value)}
                  placeholder="Badge"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => removeBadge(index)}
                  style={{ flexShrink: 0 }}
                >
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addBadge}>
              + Adicionar Badge
            </button>
          </div>
        </div>

        <div className="editor-field">
          <label>Texto do Botão Principal</label>
          <input
            type="text"
            className="form-control"
            value={value.ctaLabel ?? ''}
            onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
            placeholder="Agendar sessão"
          />
        </div>

        <div className="editor-field">
          <LinkPicker
            label="Link do Botão Principal"
            value={linkValueFrom(value.ctaHref, value.ctaLinkMode as any, value.ctaPageKey as any, value.ctaPageId as any, value.ctaSlug as any)}
            onChange={(val) =>
              onChange({
                ...value,
                ctaHref: val.href,
                ctaLinkMode: val.mode,
                ctaPageKey: val.pageKey ?? null,
                ctaPageId: val.pageId ?? null,
                ctaSlug: val.slug ?? null
              })
            }
          />
        </div>

        <div className="editor-field">
          <label>Texto do Botão Secundário</label>
          <input
            type="text"
            className="form-control"
            value={value.secondaryCta ?? ''}
            onChange={(e) => onChange({ ...value, secondaryCta: e.target.value })}
            placeholder="Conhecer a abordagem"
          />
        </div>

        <div className="editor-field">
          <LinkPicker
            label="Link do Botão Secundário"
            value={linkValueFrom(
              value.secondaryHref,
              value.secondaryLinkMode as any,
              value.secondaryPageKey as any,
              value.secondaryPageId as any,
              value.secondarySlug as any
            )}
            onChange={(val) =>
              onChange({
                ...value,
                secondaryHref: val.href,
                secondaryLinkMode: val.mode,
                secondaryPageKey: val.pageKey ?? null,
                secondaryPageId: val.pageId ?? null,
                secondarySlug: val.slug ?? null
              })
            }
          />
        </div>
      </div>

      <div className="editor-field">
        <label>Conteúdo da coluna direita</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'single_image', label: 'Somente imagem' },
              { value: 'cards_only', label: 'Cards (1 grande + 3 pequenos)' },
              { value: 'four_cards', label: 'Cards com imagens (1 médio + 3 pequenos)' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
              className={mediaMode === opt.value ? 'active' : ''}
              onClick={() => handleModeChange(opt.value as HeroMediaMode)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {mediaMode === 'single_image' && renderSingleImage()}
      {(mediaMode === 'cards_only' || mediaMode === 'four_cards') && renderFourCards()}

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt })}
        currentMediaId={
          imageTarget?.type === 'singleImage'
            ? value.singleImage?.imageId ?? undefined
            : imageTarget?.type === 'medium'
              ? fourCards.medium.imageId ?? undefined
              : imageTarget?.type === 'small' && imageTarget.index !== undefined
                ? ensureSmall()[imageTarget.index].imageId ?? undefined
                : undefined
        }
      />
    </div>
  );
}

// ================= PILLS BLOCK FORM =================
function PillsBlockForm(_props: { 
  value: import('../types').PillsBlockData; 
  onChange: (value: import('../types').PillsBlockData) => void 
}) {
  const { value, onChange } = _props;
  // Use pills as primary field, items as fallback for legacy data
  const rawItems = value.pills ?? value.items ?? [];
  // Normalize to PillItem objects
  const items = rawItems.map((item): import('../types').PillItem => 
    typeof item === 'string' ? { text: item, href: null, linkMode: null, articleSlug: null } : item
  );
  const size = value.size ?? 'sm';
  const variant = value.variant ?? 'neutral';

  const handleAddItem = () => {
    onChange({ 
      ...value, 
      pills: [...items, { text: 'Nova tag', href: null, linkMode: null, articleSlug: null }] 
    });
  };

  const handleUpdateItem = (index: number, updates: Partial<import('../types').PillItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange({ ...value, pills: next });
  };

  const handleRemoveItem = (index: number) => {
    onChange({ ...value, pills: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Tamanho</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'sm', label: 'Pequeno' },
              { value: 'md', label: 'Médio' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={size === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, size: opt.value as 'sm' | 'md' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Estilo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'neutral', label: 'Neutro' },
              { value: 'primary', label: 'Primário' },
              { value: 'accent', label: 'Destaque' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as 'neutral' | 'primary' | 'accent' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label>Pills/Tags</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                padding: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg-soft)'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItem(index, { text: e.target.value })}
                    placeholder="Texto da tag"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRemoveItem(index)}
                    style={{ padding: '0.5rem' }}
                  >
                    Remover
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Link (opcional)</label>
                  <div className="page-columns-toggle compact">
                    <button
                      type="button"
                      className={!item.linkMode || item.linkMode === 'manual' ? 'active' : ''}
                      onClick={() => handleUpdateItem(index, { linkMode: 'manual', articleSlug: null })}
                    >
                      URL Manual
                    </button>
                    <button
                      type="button"
                      className={item.linkMode === 'article' ? 'active' : ''}
                      onClick={() => handleUpdateItem(index, { linkMode: 'article', href: null })}
                    >
                      Artigo
                    </button>
                  </div>
                  
                  {(!item.linkMode || item.linkMode === 'manual') && (
                    <input
                      type="text"
                      value={item.href ?? ''}
                      onChange={(e) => handleUpdateItem(index, { href: e.target.value || null })}
                      placeholder="https://exemplo.com ou /sobre"
                    />
                  )}
                  
                  {item.linkMode === 'article' && (
                    <input
                      type="text"
                      value={item.articleSlug ?? ''}
                      onChange={(e) => handleUpdateItem(index, { articleSlug: e.target.value || null })}
                      placeholder="slug-do-artigo"
                    />
                  )}
                  
                  {item.linkMode === 'article' && item.articleSlug && (
                    <small className="muted" style={{ fontSize: '0.75rem' }}>
                      Link: /blog/{item.articleSlug}
                    </small>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={handleAddItem}>
              + Adicionar tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= SPAN BLOCK FORM =================
function SpanBlockForm(_props: { 
  value: import('../types').SpanBlockData; 
  onChange: (value: import('../types').SpanBlockData) => void 
}) {
  const { value, onChange } = _props;
  const kind = value.kind ?? 'accent-bar';

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Tipo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'accent-bar', label: 'Barra de destaque' },
              { value: 'muted-text', label: 'Texto discreto' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={kind === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, kind: opt.value as 'accent-bar' | 'muted-text', text: opt.value === 'accent-bar' ? undefined : value.text })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {kind === 'muted-text' && (
          <div className="editor-field">
            <label>Texto</label>
            <input
              type="text"
              value={value.text ?? ''}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              placeholder="Digite o texto"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ================= BUTTON GROUP BLOCK FORM =================
function ButtonGroupBlockForm(_props: { 
  value: import('../types').ButtonGroupBlockData; 
  onChange: (value: import('../types').ButtonGroupBlockData) => void 
}) {
  const { value, onChange } = _props;
  const buttons = value.buttons ?? [];
  const align = value.align ?? 'start';
  const stackOnMobile = value.stackOnMobile ?? true;

  const handleAddButton = () => {
    if (buttons.length >= 2) return;
    onChange({
      ...value,
      buttons: [...buttons, { label: 'Novo botão', href: '', variant: 'primary' }]
    });
  };

  const handleUpdateButton = (index: number, updates: Partial<import('../types').ButtonGroupButton>) => {
    const next = [...buttons];
    next[index] = { ...next[index], ...updates };
    onChange({ ...value, buttons: next });
  };

  const handleRemoveButton = (index: number) => {
    onChange({ ...value, buttons: buttons.filter((_, i) => i !== index) });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Alinhamento</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'start', label: 'Esquerda' },
              { value: 'center', label: 'Centro' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={align === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, align: opt.value as 'start' | 'center' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Empilhar em mobile</label>
          <Switch
            checked={stackOnMobile}
            onChange={(checked) => onChange({ ...value, stackOnMobile: checked })}
          />
        </div>

        <div className="editor-field">
          <label>Botões (máximo 2)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {buttons.map((button, index) => (
              <div key={index} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="small">Texto do botão</label>
                    <input
                      type="text"
                      value={button.label}
                      onChange={(e) => handleUpdateButton(index, { label: e.target.value })}
                      placeholder="Ex: Saiba mais"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="small">Link</label>
                    <LinkPicker
                      value={{
                        mode: button.linkMode ?? 'manual',
                        href: button.href,
                        pageId: button.pageId ?? undefined,
                        pageKey: button.pageKey ?? undefined,
                        slug: button.slug ?? undefined
                      }}
                      onChange={(val) =>
                        handleUpdateButton(index, {
                          linkMode: val.mode,
                          href: val.href ?? '',
                          pageId: val.pageId ?? null,
                          pageKey: val.pageKey ?? null,
                          slug: val.slug ?? null
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="small">Estilo</label>
                    <div className="page-columns-toggle compact">
                      {[
                        { value: 'primary', label: 'Primário' },
                        { value: 'secondary', label: 'Secundário' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={button.variant === opt.value ? 'active' : ''}
                          onClick={() => handleUpdateButton(index, { variant: opt.value as 'primary' | 'secondary' })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRemoveButton(index)}
                  >
                    Remover botão
                  </button>
                </div>
              </div>
            ))}
            {buttons.length < 2 && (
              <button type="button" className="btn btn-outline" onClick={handleAddButton}>
                + Adicionar botão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialLinksBlockForm(_props: {
  value: import('../types').SocialLinksBlockData;
  onChange: (value: import('../types').SocialLinksBlockData) => void;
}) {
  const { value, onChange } = _props;
  const title = value.title ?? '';
  const variant = value.variant ?? 'list';
  const showIcons = value.showIcons ?? true;
  const columns = value.columns ?? 1;
  const align = value.align ?? 'start';

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ex: Siga-nos"
          />
        </div>

        <div className="editor-field">
          <label>Estilo de apresentação</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'list', label: 'Lista' },
              { value: 'chips', label: 'Chips' },
              { value: 'buttons', label: 'Botões' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={variant === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, variant: opt.value as 'list' | 'chips' | 'buttons' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Mostrar ícones</label>
          <Switch
            checked={showIcons}
            onChange={(checked) => onChange({ ...value, showIcons: checked })}
          />
        </div>

        {variant === 'list' && (
          <div className="editor-field">
            <label>Colunas</label>
            <div className="page-columns-toggle compact">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={columns === n ? 'active' : ''}
                  onClick={() => onChange({ ...value, columns: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="editor-field">
          <label>Alinhamento</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'left', label: 'Esquerda' },
              { value: 'center', label: 'Centro' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={align === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, align: opt.value as 'left' | 'center' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            ℹ️ As redes sociais são gerenciadas em <strong>Configurações do Site</strong>. 
            Este bloco renderiza automaticamente todas as redes visíveis.
          </p>
        </div>
      </div>
    </div>
  );
}

function WhatsAppCtaBlockForm(_props: {
  value: import('../types').WhatsAppCtaBlockData;
  onChange: (value: import('../types').WhatsAppCtaBlockData) => void;
}) {
  const { value, onChange } = _props;
  const label = value.label ?? 'Fale conosco no WhatsApp';
  const style = value.style ?? 'primary';
  const openInNewTab = value.openInNewTab ?? true;
  const hideWhenDisabled = value.hideWhenDisabled ?? true;

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Texto do botão</label>
          <input
            type="text"
            value={label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="Ex: Fale conosco no WhatsApp"
          />
        </div>

        <div className="editor-field">
          <label>Estilo</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'primary', label: 'Primário' },
              { value: 'secondary', label: 'Secundário' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={style === opt.value ? 'active' : ''}
                onClick={() => onChange({ ...value, style: opt.value as 'primary' | 'secondary' })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Abrir em nova aba</label>
          <Switch
            checked={openInNewTab}
            onChange={(checked) => onChange({ ...value, openInNewTab: checked })}
          />
        </div>

        <div className="editor-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Ocultar quando WhatsApp estiver desativado</label>
          <Switch
            checked={hideWhenDisabled}
            onChange={(checked) => onChange({ ...value, hideWhenDisabled: checked })}
          />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            ℹ️ O link e mensagem do WhatsApp são gerenciados em <strong>Configurações do Site</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
