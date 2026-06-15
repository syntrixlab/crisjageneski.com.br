import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ArticleStatusBadge, ConfirmModal, IconButton, Modal } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { PageBlockView, PageRendererCore } from '../components/PageRenderer';
import { usePageValidation } from '../hooks/usePageValidation';
import { ValidationErrorsModal, ValidationInput, CharCounter } from '../components/ValidationComponents';
import { blockRegistry } from '@/blocks/registry';
import type { BlockType } from '../types';
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
  CardBlockData,
  CtaBlockData,
  MediaTextBlockData,
  FormBlockData,
  ImageBlockData,
  HeroMediaMode,
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
import { ensureHeroInSection, isHeroV1 } from '../utils/heroMigration';
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
      const normalizedLayout = ensureLayoutV2(existingPage.layout);

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
        onGoToError={() => {
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
  const label = blockRegistry[block.type as BlockType]?.label ?? block.type;
  
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

      {draft && (() => {
        const config = blockRegistry[selectedType as BlockType];
        if (!config) return null;
        const Form = config.form as React.ComponentType<{
          value: unknown;
          onChange: (value: unknown) => void;
          onUploadingChange?: (uploading: boolean) => void;
        }>;
        return (
          <Form
            value={draft.data}
            onChange={(data) => setDraft((prev) => (prev ? { ...prev, data: data as PageBlock['data'] } : prev))}
            onUploadingChange={setUploading}
          />
        );
      })()}

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

