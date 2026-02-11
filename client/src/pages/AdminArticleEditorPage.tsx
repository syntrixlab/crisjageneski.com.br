import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SeoHead } from '../components/SeoHead';
import { ArticleStatusBadge, ConfirmModal, Switch } from '../components/AdminUI';
import {
  createArticle,
  fetchAdminArticles,
  publishArticle,
  unpublishArticle,
  updateArticle,
  uploadMedia
} from '../api/queries';
import type { Article, Media } from '../types';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImagePickerModal } from '../components/ImagePickerModal';
import type { CropRatio } from '../components/FlexibleImageCropModal';
import { COVER_ASPECT, COVER_HEIGHT, COVER_MAX_FILE_SIZE_MB, COVER_WIDTH } from '../constants';
import { ImageCropModal } from '../components/ImageCropModal';
import type { CropMetadata } from '../utils/cropImageToBlob';

type CropTask = {
  src: string;
  file: File;
};

type ArticleForm = Partial<Article>;

const emptyArticle: ArticleForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  status: 'draft',
  tags: [],
  isFeatured: false
};

type ArticleEditorActionsProps = {
  article: ArticleForm;
  isNew: boolean;
  busy: boolean;
  draftAlert: string | null;
  formError: string | null;
  hasUploadingBlocks: boolean;
  onSaveDraft: () => void;
  onRequestPublish: () => void;
  onRequestUnpublish: () => void;
};

function ArticleEditorActions({
  article,
  isNew,
  busy,
  draftAlert,
  formError,
  hasUploadingBlocks,
  onSaveDraft,
  onRequestPublish,
  onRequestUnpublish
}: ArticleEditorActionsProps) {
  const status = (article.status ?? 'draft') as 'draft' | 'published';

  return (
    <div className="editor-topbar compact">
      <div className="editor-topbar-left">
        <Link to="/admin/articles" className="btn btn-ghost">
          Voltar
        </Link>
        <ArticleStatusBadge status={status} />
        {draftAlert && <span className="muted small">{draftAlert}</span>}
        {formError && <span className="muted small tone-danger">{formError}</span>}
        {hasUploadingBlocks && <span className="muted small">Finalize uploads antes de salvar.</span>}
      </div>
      <div className="editor-topbar-actions">
        <button className="btn btn-outline" type="button" onClick={onSaveDraft} disabled={busy}>
          Salvar rascunho
        </button>
        {status === 'draft' ? (
          <button className="btn btn-primary" type="button" onClick={onRequestPublish} disabled={busy || isNew}>
            Publicar
          </button>
        ) : (
          <button className="btn btn-outline" type="button" onClick={onRequestUnpublish} disabled={busy}>
            Mover para rascunho
          </button>
        )}
        {status === 'published' && (
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => article.slug && window.open(`/blog/${article.slug}`, '_blank')}
            disabled={!article.slug}
          >
            Visualizar
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: articles } = useQuery<Article[]>({ queryKey: ['admin', 'posts'], queryFn: fetchAdminArticles });
  const current = useMemo(() => articles?.find((a) => a.id === id), [articles, id]);
  const [article, setArticle] = useState<ArticleForm>(current || emptyArticle);
  const [cropTask, setCropTask] = useState<CropTask | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverMeta, setCoverMeta] = useState<CropMetadata | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<ArticleForm | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<ArticleForm | null>(null);
  const [hasUploadingBlocks, setHasUploadingBlocks] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [showRemoveCoverConfirm, setShowRemoveCoverConfirm] = useState(false);
  const [tagLimitWarning, setTagLimitWarning] = useState<string | null>(null);

  useEffect(() => {
    if (current) {
      setArticle({
        ...current,
        isFeatured: current.isFeatured ?? false
      });
      setCoverPreview(current.coverImageUrl ?? current.coverMedia?.url ?? null);
      setTagsText(current.tags?.join(', ') ?? '');
    }
  }, [current?.id]);

  const handleSelectCoverImage = (image: { 
    mediaId: string; 
    src: string; 
    alt: string; 
    cropData?: { x: number; y: number; width: number; height: number; ratio: string } 
  }) => {
    // Para capa do artigo, usar diretamente os dados com crop
    setArticle(prev => ({
      ...prev,
      coverMediaId: image.mediaId,
      coverImageUrl: image.src,
      coverAlt: image.alt,
      // Salvar crop data no coverCrop
      coverCrop: image.cropData ? {
        x: image.cropData.x,
        y: image.cropData.y,
        width: image.cropData.width,
        height: image.cropData.height,
        ratio: image.cropData.ratio
      } : null
    }));
    setImagePickerOpen(false);
  };

  const handleCropConfirm = async (file: File, meta: CropMetadata) => {
    const alt = article.title || 'Capa do artigo';
    setCoverUploading(true);
    try {
      const uploaded = await uploadMedia({ file, alt });
      const mediaPayload: Media = {
        id: uploaded.mediaId,
        url: uploaded.url,
        alt: uploaded.alt ?? alt,
        mimeType: file.type,
        size: file.size,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null
      };
      setArticle((prev) => ({
        ...prev,
        coverMediaId: uploaded.mediaId,
        coverCrop: meta,
        coverImageUrl: uploaded.url,
        coverAlt: mediaPayload.alt
      }));
      setCoverPreview(uploaded.url);
      setCoverMeta(meta);
      setCropTask(null);
      setCoverError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar a capa';
      setCoverError(msg);
    } finally {
      setCoverUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Article>) => createArticle(payload),
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Falha ao salvar o artigo.';
      setFormError(message);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      navigate(`/admin/articles/${data.id}/edit`, { replace: true });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Article> }) => updateArticle(id, payload),
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Falha ao atualizar o artigo.';
      setFormError(message);
    },
    onSuccess: (data) => {
      const wasFeatured = !!article.isFeatured;
      const alerts: string[] = [];
      if (data.changedToDraft) {
        alerts.push('Este artigo voltou para rascunho. Publique novamente para atualizar no site.');
      }
      // Atualizar estado local com os dados retornados da API
      if (data.post) {
        setArticle(data.post);
        if (wasFeatured && !data.post.isFeatured) {
          alerts.push('Posts em destaque precisam estar publicados.');
        }
      }
      
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      
      if (alerts.length) {
        setDraftAlert(alerts.join(' '));
      }
    }
  });

  const publishMutation = useMutation({
    mutationFn: publishArticle,
    onSuccess: (updatedArticle) => {
      // Atualizar estado local imediatamente com dados da API
      setArticle(updatedArticle);
      // Invalidar caches para manter consistencia
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setPublishTarget(null);
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishArticle,
    onSuccess: (updatedArticle) => {
      // Atualizar estado local imediatamente com dados da API
      setArticle(updatedArticle);
      // Invalidar caches para manter consistencia
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setUnpublishTarget(null);
    }
  });

  const busy = createMutation.isPending || updateMutation.isPending || publishMutation.isPending || unpublishMutation.isPending || coverUploading || hasUploadingBlocks;

  const normalizeTags = (input: string) => {
    const seen = new Set<string>();
    let list = input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (list.length > 10) {
      list = list.slice(0, 10);
      setTagLimitWarning('Maximo de 10 tags; extras foram ignoradas.');
    } else {
      setTagLimitWarning(null);
    }
    return list;
  };

  const formatTagsText = (input: string) => normalizeTags(input).join(', ');

  const logContentForDebug = (action: string, content?: string | null) => {
    if (!content) return;
    console.log(`[ArticleEditor] ${action} content:`, content);
    const hasImageMeta = /rte-image--(size|align)|data-size|data-align/.test(content);
    console.log(`[ArticleEditor] ${action} contains image metadata?`, hasImageMeta);
  };

  useEffect(() => {
    if (current?.content) {
      logContentForDebug('loaded-from-api', current.content);
    }
  }, [current?.id, current?.content]);

  const validate = () => {
    const trimmedTitle = (article.title ?? '').trim();
    const trimmedSlug = (article.slug ?? '').trim();
    const trimmedExcerpt = (article.excerpt ?? '').trim();
    const trimmedContent = (article.content ?? '').trim();
    if (trimmedTitle.length < 3) return 'Informe um titulo com ao menos 3 caracteres.';
    if (trimmedSlug.length < 3) return 'Informe um slug com ao menos 3 caracteres.';
    if (trimmedExcerpt.length < 10) return 'Resumo precisa de ao menos 10 caracteres.';
    if (trimmedContent.length < 10) return 'Conteudo precisa de ao menos 10 caracteres.';
    return null;
  };

  const handleSaveDraft = () => {
    if (hasUploadingBlocks) {
      setDraftAlert('Finalize os uploads de imagem antes de salvar.');
      return;
    }
    const tags = normalizeTags(tagsText);
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    const payloadBase: Partial<Article> = {
      ...article,
      tags,
      status: 'draft'
      // NÃO resetar isFeatured - preservar o valor atual
    };
    setArticle((prev) => ({ ...prev, ...payloadBase }));
    logContentForDebug('before-save-draft', article.content);
    if (isNew) {
      createMutation.mutate(payloadBase);
    } else if (article.id) {
      updateMutation.mutate({ id: article.id, payload: payloadBase });
    }
  };

  const handlePublish = () => {
    if (!article.id) return;
    publishMutation.mutate(article.id);
  };

  const handleRequestPublish = () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    const tags = normalizeTags(tagsText);
    setArticle((prev) => ({ ...prev, tags }));
    logContentForDebug('before-request-publish', article.content);
    setPublishTarget({ ...article, tags });
  };

  const handleConfirmRemoveCover = () => {
    setCoverPreview(null);
    setCoverMeta(null);
    setArticle((p) => ({ ...p, coverMediaId: null, coverCrop: null, coverImageUrl: null, coverAlt: null }));
    setShowRemoveCoverConfirm(false);
  };

  const handleMoveToDraft = () => {
    if (!article.id) return;
    unpublishMutation.mutate(article.id);
  };

  const rightColumn = (
    <div className="editor-side">
      <div className="admin-card editor-card" style={{ display: 'grid', gap: '0.75rem' }}>
        <div className="muted small">Configuracoes</div>
        <div className="editor-field">
          <label>Titulo</label>
          <input value={article.title} onChange={(e) => setArticle((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="editor-field">
          <label>Slug</label>
          <input value={article.slug} onChange={(e) => setArticle((p) => ({ ...p, slug: e.target.value }))} />
        </div>
        <div className="editor-field">
          <label>Resumo</label>
          <textarea
            value={article.excerpt}
            onChange={(e) => setArticle((p) => ({ ...p, excerpt: e.target.value }))}
            rows={3}
          />
        </div>
        <div className="editor-field">
          <label>Tags (separadas por virgula)</label>
          <input
            value={tagsText}
            onChange={(e) => {
              const val = e.target.value
              setTagsText(val)
              setArticle((prev) => ({ ...prev, tags: normalizeTags(val) }))
            }}
            onBlur={() => {
              setTagsText((prev) => {
                const formatted = formatTagsText(prev)
                setArticle((p) => ({ ...p, tags: normalizeTags(formatted) }))
                return formatted
              })
            }}
            placeholder="ansiedade, terapia, junguiana"
          />
          {article.tags && article.tags.length > 0 && (
            <div className="tag-preview">
              {article.tags.map((tag) => (
                <span key={tag} className="nav-chip-soft">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {tagLimitWarning && <div className="rte-error">{tagLimitWarning}</div>}
        </div>
        <div className="editor-field">
          <label>Em destaque</label>
          <Switch
            checked={!!article.isFeatured}
            onChange={(value) => setArticle((p) => ({ ...p, isFeatured: value }))}
            label="Mostrar na sessao de destaque (max 3)"
          />
          <p className="muted small">Maximo de 3 posts publicados em destaque. Rascunhos podem estar marcados, mas só aparecem no site após publicados.</p>
          {article.isFeatured && article.status === 'draft' && (
            <div className="admin-info" style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(84, 94, 69, 0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>
              <strong>ℹ️ Informação:</strong> Este artigo está marcado como destaque, mas só aparecerá na seção "Em destaque" do site quando estiver publicado.
            </div>
          )}
        </div>
      </div>
      <div className="admin-card editor-card" style={{ display: 'grid', gap: '0.75rem' }}>
        <div className="cover-card-header">
          <div className="muted small">Imagem de capa</div>
          <div className="cover-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Selecionar imagem de capa"
              title="Selecionar imagem de capa"
              onClick={() => setImagePickerOpen(true)}
            >
              <FontAwesomeIcon icon={faImage} />
            </button>
            <button
              type="button"
              className="icon-button tone-danger"
              aria-label="Remover imagem de capa"
              title="Remover imagem de capa"
              disabled={!coverPreview}
              onClick={() => setShowRemoveCoverConfirm(true)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>
        <div className="cover-upload-header">
          <p className="muted small" style={{ margin: 0 }}>
            Proporcao {COVER_ASPECT.toFixed(2)} (exportamos em {COVER_WIDTH}x{COVER_HEIGHT}).
          </p>
        </div>
        <div className="cover-preview-box" style={{ aspectRatio: COVER_ASPECT }}>
          {coverPreview ? (
            <img src={coverPreview} alt={article.coverAlt ?? article.title} />
          ) : (
            <div className="cover-placeholder premium">
              <span>Sem capa</span>
              <small>Selecione uma imagem (JPG/PNG/WEBP, max {COVER_MAX_FILE_SIZE_MB}MB).</small>
            </div>
          )}
        </div>
        {coverMeta && (
          <div className="muted small" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>
              Recorte: {COVER_WIDTH}x{COVER_HEIGHT}
            </span>
            <span>Zoom {coverMeta.zoom.toFixed(2)}</span>
          </div>
        )}
        {coverError && (
          <div className="admin-empty" role="alert">
            {coverError}
          </div>
        )}
      </div>
    </div>
  );


  return (
    <div className="admin-page editor-page">
      <SeoHead title={isNew ? 'Novo artigo' : `Editar: ${article.title}`} />
      <ArticleEditorActions
        article={article}
        isNew={isNew}
        busy={busy}
        draftAlert={draftAlert}
        formError={formError}
        hasUploadingBlocks={hasUploadingBlocks}
        onSaveDraft={handleSaveDraft}
        onRequestPublish={handleRequestPublish}
        onRequestUnpublish={() => setUnpublishTarget(article)}
      />

      <div className="editor-body">
        <div className="editor-container">
          <div className="editor-grid">
            <div className="editor-main">
              <RichTextEditor
                value={article.content ?? ''}
                onChange={(value) => setArticle((p) => ({ ...p, content: value }))}
                onUploadingChange={setHasUploadingBlocks}
              />
            </div>
            <div className="editor-side">{rightColumn}</div>
          </div>
        </div>
      </div>

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={handleSelectCoverImage}
        currentMediaId={article.coverMediaId}
        enableCrop={true}
        cropRatio="16:9"
        cropTitle="Recortar Capa do Artigo"
        initialCropData={
          article.coverCrop && (article.coverCrop as any).x !== undefined
            ? {
                x: Number((article.coverCrop as any).x),
                y: Number((article.coverCrop as any).y),
                width: Number((article.coverCrop as any).width),
                height: Number((article.coverCrop as any).height),
                ratio: ((article.coverCrop as any).ratio ?? '16:9') as CropRatio,
              }
            : null
        }
      />

      <ImageCropModal
        open={!!cropTask}
        imageSrc={cropTask?.src}
        imageFile={cropTask?.file}
        aspect={COVER_ASPECT}
        outputWidth={COVER_WIDTH}
        outputHeight={COVER_HEIGHT}
        onCancel={() => {
          if (cropTask?.src) URL.revokeObjectURL(cropTask.src);
          setCropTask(null);
          setCoverError(null);
        }}
        onConfirm={handleCropConfirm}
      />

      <ConfirmModal
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publicar artigo"
        description={`Publicar "${publishTarget?.title}"? Ele ficara visivel no site.`}
        onConfirm={() => publishTarget && handlePublish()}
        confirmLabel="Publicar"
        loading={publishMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!unpublishTarget}
        onClose={() => setUnpublishTarget(null)}
        title="Mover para rascunho"
        description={`Mover "${unpublishTarget?.title}" para rascunho? Saira do site ate ser publicado novamente.`}
        onConfirm={() => unpublishTarget && handleMoveToDraft()}
        confirmLabel="Mover"
        loading={unpublishMutation.isPending}
      />

      <ConfirmModal
        isOpen={showRemoveCoverConfirm}
        onClose={() => setShowRemoveCoverConfirm(false)}
        title="Remover imagem de capa"
        description="Remover a imagem de capa deste artigo?"
        onConfirm={handleConfirmRemoveCover}
        confirmLabel="Remover"
      />
    </div>
  );
}
