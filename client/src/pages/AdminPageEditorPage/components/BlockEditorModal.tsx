import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/AdminUI';
import { blockRegistry } from '@/blocks/registry';
import { isHeroV1 } from '@/utils/heroMigration';
import type {
  PageBlock,
  BlockType,
  TextBlockData,
  ImageBlockData,
  ButtonBlockData,
  CardBlockData,
  CtaBlockData,
  FormBlockData,
  HeroBlockData,
  HeroBlockDataV1,
  HeroMediaMode,
  MediaTextBlockData,
  ServicesBlockData
} from '@/types';
import type { BlockDraft, BlockModalState } from '../hooks/useBlockManager';

const plainTextLength = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length;

const toBlockDraft = (block?: PageBlock): BlockDraft | null =>
  block
    ? {
        id: block.id,
        type: block.type,
        colSpan: block.colSpan ?? 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: block.data as any,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      }
    : null;

// Kept only for V1 hero validation fallback (registry hero default is V2 — different schema)
const heroV1FallbackFourCards = {
  medium: { title: 'Sessão', text: 'Texto', icon: null, imageId: null, url: null, alt: null },
  small: [
    { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.', icon: null, imageId: null, url: null, alt: null },
    { title: 'Relações saudáveis', text: 'Comunicação e limites claros.', icon: null, imageId: null, url: null, alt: null },
    { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.', icon: null, imageId: null, url: null, alt: null }
  ]
};

export function BlockEditorModal(_props: {
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
      const config = blockRegistry[type as BlockType];
      const defaults = config?.defaultData ?? {};
      const span =
        type === 'hero' || type === 'recent-posts' || type === 'services'
          ? columnCount
          : Math.min(columnCount, 1);
      setDraft({ type, data: defaults as PageBlock['data'], colSpan: span });
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
      if (isHeroV1(data)) {
        const mode: HeroMediaMode = ((data as HeroBlockDataV1).mediaMode as HeroMediaMode) ?? 'four_cards';
        if (mode === 'single_image' && !(data as HeroBlockDataV1).singleImage?.url) {
          setError('Selecione uma imagem para o modo "Somente imagem".');
          return;
        }
        if (mode === 'four_cards' || mode === 'cards_only') {
          const fc = (data as HeroBlockDataV1).fourCards ?? heroV1FallbackFourCards;
          if (!fc.medium.title?.trim() || !fc.medium.text?.trim()) {
            setError('O card médio precisa de título e texto.');
            return;
          }
          const small = fc.small ?? heroV1FallbackFourCards.small;
          if (small.some((c: { title?: string; text?: string }) => !c.title?.trim() || !c.text?.trim())) {
            setError('Todos os 3 cards pequenos precisam de título e texto.');
            return;
          }
        }
      }
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
