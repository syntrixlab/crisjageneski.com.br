import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import type { CropRatio } from '@/components/FlexibleImageCropModal';
import type { ImageBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function ImageBlockForm({ value, onChange, onUploadingChange: _onUploadingChange }: BlockFormProps<ImageBlockData>) {
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
