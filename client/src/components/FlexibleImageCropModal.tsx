// LEGACY IMPLEMENTATION (comentada para referência)
// import Cropper, { type Area } from 'react-easy-crop';
// import 'react-easy-crop/react-easy-crop.css';
// export function FlexibleImageCropModal(...) { ... }

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PercentCrop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from './AdminUI';

export type CropRatio = '16:9' | '9:16' | '1:1' | '4:3' | 'free';

export type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: CropRatio;
};

type FlexibleImageCropModalProps = {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (cropData: CropData) => void;
  title?: string;
  initialRatio?: CropRatio;
  initialCropData?: CropData | null;
  allowRatioChange?: boolean;
};

const RATIO_OPTIONS: CropRatio[] = ['16:9', '9:16', '1:1', '4:3', 'free'];

const ratioToNumber = (ratio: CropRatio): number | undefined => {
  switch (ratio) {
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    default:
      return undefined; // free
  }
};

export function FlexibleImageCropModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  title = 'Recortar Imagem',
  initialRatio = 'free',
  initialCropData = null,
  allowRatioChange = true,
}: FlexibleImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<CropRatio>(initialRatio);
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 20, y: 20, width: 60, height: 60 });
  const [completedCrop, setCompletedCrop] = useState<{ percent: PercentCrop; pixels: PixelCrop } | null>(null);
  const [hasAppliedInitial, setHasAppliedInitial] = useState(false);

  const aspect = useMemo(() => ratioToNumber(selectedRatio), [selectedRatio]);

  useEffect(() => {
    if (!open) return;
    setSelectedRatio(initialCropData?.ratio ?? initialRatio);
    setHasAppliedInitial(false);
    setCompletedCrop(null);
  }, [open, imageSrc, initialRatio, initialCropData?.ratio]);

  const applyInitialCrop = () => {
    if (!initialCropData || !naturalSize) return;
    const { width: iw, height: ih } = naturalSize;
    const px = initialCropData;
    const toPercent = (value: number, total: number) => (value / total) * 100;
    const percentCrop: PercentCrop = {
      unit: '%',
      x: toPercent(px.x, iw),
      y: toPercent(px.y, ih),
      width: toPercent(px.width, iw),
      height: toPercent(px.height, ih),
    };
    setCrop(percentCrop);
    const pixel: PixelCrop = { x: px.x, y: px.y, width: px.width, height: px.height, unit: 'px' };
    setCompletedCrop({ percent: percentCrop, pixels: pixel });
    setSelectedRatio(px.ratio ?? initialRatio);
    setHasAppliedInitial(true);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
  };

  useEffect(() => {
    if (open && initialCropData && naturalSize && !hasAppliedInitial) {
      applyInitialCrop();
    }
  }, [open, initialCropData, naturalSize, hasAppliedInitial]);

  const handleCropComplete = (pixelCrop: PixelCrop, percentCrop: PercentCrop) => {
    console.log('[FlexibleImageCropModal] Crop completed:', { pixelCrop, percentCrop });
    setCompletedCrop({ percent: percentCrop, pixels: pixelCrop });
  };

  const handleRatioChange = (ratio: CropRatio) => {
    setSelectedRatio(ratio);
    setCrop({ unit: '%', x: 20, y: 20, width: 60, height: 60 });
    setCompletedCrop(null);
  };

  const handleConfirm = () => {
    console.log('[FlexibleImageCropModal] handleConfirm called');
    console.log('[FlexibleImageCropModal] completedCrop:', completedCrop);
    console.log('[FlexibleImageCropModal] imgRef.current:', imgRef.current);
    console.log('[FlexibleImageCropModal] naturalSize:', naturalSize);
    
    if (!completedCrop || !imgRef.current || !naturalSize) {
      console.warn('[FlexibleImageCropModal] Missing required data for crop');
      if (!completedCrop) console.warn('  - No completedCrop');
      if (!imgRef.current) console.warn('  - No imgRef');
      if (!naturalSize) console.warn('  - No naturalSize');
      return;
    }

    const imgEl = imgRef.current;
    const renderedWidth = imgEl.width || imgEl.getBoundingClientRect().width;
    const renderedHeight = imgEl.height || imgEl.getBoundingClientRect().height;
    const scaleX = naturalSize.width / renderedWidth;
    const scaleY = naturalSize.height / renderedHeight;

    const px = completedCrop.pixels;
    const cropData: CropData = {
      x: Math.round(px.x * scaleX),
      y: Math.round(px.y * scaleY),
      width: Math.round(px.width * scaleX),
      height: Math.round(px.height * scaleY),
      ratio: selectedRatio,
    };

    console.log('[FlexibleImageCropModal] Final cropData:', cropData);
    console.log('[FlexibleImageCropModal] Calling onConfirm...');
    
    try {
      onConfirm(cropData);
      console.log('[FlexibleImageCropModal] onConfirm completed successfully');
    } catch (error) {
      console.error('[FlexibleImageCropModal] Error in onConfirm:', error);
    }
  };

  const handleReset = () => {
    setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
    setCompletedCrop(null);
  };

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      description="Ajuste o enquadramento da imagem."
      width={860}
    >
      <div className="cropper-shell">
        {allowRatioChange && (
          <div className="cropper-ratio-controls" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '0.75rem' }}>
              Proporção:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {RATIO_OPTIONS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={`btn btn-sm ${selectedRatio === ratio ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRatioChange(ratio)}
                >
                  {ratio === 'free' ? 'Livre' : ratio}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cropper-preview" aria-label="Área de recorte" style={{ maxHeight: '500px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={handleCropComplete}
            aspect={aspect}
            keepSelection
            style={{ maxWidth: '100%' }}
          >
            <img 
              ref={imgRef} 
              src={imageSrc} 
              alt="Imagem para recorte" 
              onLoad={handleImageLoad}
              style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block' }}
            />
          </ReactCrop>
        </div>

        <div className="cropper-controls">
          <div className="cropper-help">
            <strong>
              {selectedRatio === 'free' ? 'Proporção livre' : `Proporção ${selectedRatio}`}
            </strong>
            <p className="muted small">Arraste o retângulo para ajustar o recorte.</p>
          </div>
          <div className="cropper-actions">
            <button className="btn btn-outline" type="button" onClick={handleReset}>
              Resetar
            </button>
          </div>
        </div>
      </div>

      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleConfirm}
          disabled={!completedCrop}
        >
          Aplicar Recorte
        </button>
      </div>
    </Modal>
  );
}
