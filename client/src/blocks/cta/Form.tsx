import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';
import type { CtaBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function CtaBlockForm({ value, onChange }: BlockFormProps<CtaBlockData>) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const linkValue: LinkPickerValue = {
    // ctaLinkMode can be null in stored data; fall back to 'page' to satisfy LinkPickerValue['mode']
    mode: (value.ctaLinkMode ?? 'page') as LinkPickerValue['mode'],
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
