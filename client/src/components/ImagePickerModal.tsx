import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMedia, uploadMedia, saveCropData } from '../api/queries';
import type { Media } from '../types';
import { FlexibleImageCropModal, type CropData, type CropRatio } from './FlexibleImageCropModal';
import { Modal } from './AdminUI';

type ImagePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (image: { mediaId: string; src: string; alt: string; width?: number | null; height?: number | null; cropData?: CropData }) => void;
  currentMediaId?: string | null;
  enableCrop?: boolean;
  cropRatio?: CropRatio;
  cropTitle?: string;
  initialCropData?: CropData | null;
};

type TabMode = 'upload' | 'library';

export function ImagePickerModal({ 
  open, 
  onClose, 
  onSelect, 
  currentMediaId,
  enableCrop = false,
  cropRatio = 'free',
  cropTitle = 'Recortar Imagem',
  initialCropData = null,
}: ImagePickerModalProps) {
  const [tab, setTab] = useState<TabMode>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Crop states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<Media | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setTab('library');
      setSearchQuery('');
      setUploadFile(null);
      setUploadPreview(null);
      setIsDragging(false);
    }
  }, [open]);

  // Buscar imagens da galeria
  const { data: media, isLoading } = useQuery({
    queryKey: ['admin', 'media', searchQuery],
    queryFn: () => fetchMedia(),
    enabled: open
  });

  const filteredMedia = searchQuery && media
    ? media.filter((m) =>
        m.alt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : media || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (newMedia) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      
      if (enableCrop) {
        // Abrir modal de crop após upload
        const mediaForCrop: Media = {
          id: newMedia.mediaId,
          url: newMedia.url,
          alt: newMedia.alt,
          mimeType: 'image/jpeg', // Default, será atualizado pelo servidor
          size: 0, // Será atualizado pelo servidor
          width: newMedia.width,
          height: newMedia.height
        };
        setSelectedImageForCrop(mediaForCrop);
        setCropModalOpen(true);
      } else {
        // Auto-selecionar a imagem após upload sem crop
        onSelect({
          mediaId: newMedia.mediaId,
          src: newMedia.url,
          alt: newMedia.alt || '',
          width: newMedia.width ?? null,
          height: newMedia.height ?? null
        });
        onClose();
      }
    },
    onError: (error: any) => {
      alert(error?.response?.data?.error?.message || 'Erro ao fazer upload da imagem.');
    }
  });

  // Crop mutation
  const cropMutation = useMutation({
    mutationFn: ({ mediaId, cropData }: { mediaId: string; cropData: CropData }) =>
      saveCropData(mediaId, {
        cropX: cropData.x,
        cropY: cropData.y,
        cropWidth: cropData.width,
        cropHeight: cropData.height,
        cropRatio: cropData.ratio,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });

  const resolveInitialCropData = (media: Media | null): CropData | null => {
    if (!media) return null;

    const hasMediaCrop =
      media.cropX !== null &&
      media.cropY !== null &&
      media.cropWidth !== null &&
      media.cropHeight !== null &&
      media.cropX !== undefined &&
      media.cropY !== undefined &&
      media.cropWidth !== undefined &&
      media.cropHeight !== undefined;

    if (hasMediaCrop) {
      return {
        x: Number(media.cropX),
        y: Number(media.cropY),
        width: Number(media.cropWidth),
        height: Number(media.cropHeight),
        ratio: (media.cropRatio as CropRatio | null | undefined) ?? initialCropData?.ratio ?? cropRatio,
      };
    }

    if (initialCropData && currentMediaId && media.id === currentMediaId) {
      return { ...initialCropData };
    }

    return null;
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Tamanho máximo: 5MB.');
      return;
    }

    setUploadFile(file);

    // Gerar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('alt', uploadFile.name.replace(/\.[^/.]+$/, ''));

    uploadMutation.mutate({
      file: uploadFile,
      alt: ''
    });
  };

  const handleSelectImage = (image: Media) => {
    if (enableCrop) {
      setSelectedImageForCrop(image);
      setCropModalOpen(true);
    } else {
      onSelect({
        mediaId: image.id,
        src: image.url,
        alt: image.alt || '',
        width: image.width ?? null,
        height: image.height ?? null
      });
      onClose();
    }
  };

  // Crop handlers
  const handleCropConfirm = async (cropData: CropData) => {
    console.log('[ImagePickerModal] handleCropConfirm called with:', cropData);
    console.log('[ImagePickerModal] selectedImageForCrop:', selectedImageForCrop);
    
    if (!selectedImageForCrop) {
      console.warn('[ImagePickerModal] No selectedImageForCrop');
      return;
    }

    try {
      console.log('[ImagePickerModal] Saving crop data to server...');
      
      // Salvar crop data no servidor
      await cropMutation.mutateAsync({
        mediaId: selectedImageForCrop.id,
        cropData
      });

      console.log('[ImagePickerModal] Crop data saved successfully');
      console.log('[ImagePickerModal] Calling onSelect...');

      // Selecionar a imagem com crop data
      onSelect({
        mediaId: selectedImageForCrop.id,
        src: selectedImageForCrop.url,
        alt: selectedImageForCrop.alt || '',
        width: selectedImageForCrop.width ?? null,
        height: selectedImageForCrop.height ?? null,
        cropData
      });

      console.log('[ImagePickerModal] Closing modals...');
      setCropModalOpen(false);
      setSelectedImageForCrop(null);
      onClose();
      console.log('[ImagePickerModal] Process completed successfully');
    } catch (error) {
      console.error('[ImagePickerModal] Error saving crop:', error);
      alert('Erro ao salvar configuração de recorte.');
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setSelectedImageForCrop(null);
  };

  const initialCropForSelected = resolveInitialCropData(selectedImageForCrop);

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        title="Selecionar Imagem"
        description="Escolha uma imagem da biblioteca ou envie uma nova"
        width={820}
      >
        {/* Tabs */}
        <div className="image-picker-tabs" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            className={`image-picker-tab ${tab === 'library' ? 'active' : ''}`}
            onClick={() => setTab('library')}
          >
            📚 Biblioteca
          </button>
          <button
            type="button"
            className={`image-picker-tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            ⬆️ Enviar Nova
          </button>
        </div>

        {/* TAB: Upload */}
        {tab === 'upload' && (
          <div className="image-upload-area" style={{ marginTop: '1rem' }}>
            <div
                className={`image-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPreview ? (
                  <div className="upload-preview">
                    <img src={uploadPreview} alt="Preview" />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                    >
                      Trocar imagem
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <div className="dropzone-icon">🖼️</div>
                    <p className="dropzone-title">Arraste uma imagem aqui</p>
                    <p className="dropzone-subtitle">ou clique para selecionar</p>
                    <p className="dropzone-hint">PNG, JPG, WEBP (máx. 5MB)</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              {uploadFile && (
                <div className="upload-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? 'Enviando...' : 'Enviar e Usar Imagem'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Library */}
          {tab === 'library' && (
            <div className="image-library">
              {/* Search */}
              <div className="image-library-search">
                <input
                  type="text"
                  placeholder="Buscar por nome ou alt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="library-loading">Carregando imagens...</div>
              ) : filteredMedia.length === 0 ? (
                <div className="library-empty">
                  <p>Nenhuma imagem encontrada.</p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setTab('upload')}
                  >
                    Enviar primeira imagem
                  </button>
                </div>
              ) : (
                <div className="image-library-grid">
                  {filteredMedia.map((image) => (
                    <div
                      key={image.id}
                      className={`library-image-item ${currentMediaId === image.id ? 'selected' : ''}`}
                      onClick={() => handleSelectImage(image)}
                    >
                      <div className="library-image-thumb">
                        <img src={image.url} alt={image.alt || ''} loading="lazy" />
                        {currentMediaId === image.id && (
                          <div className="library-image-badge">✓ Atual</div>
                        )}
                      </div>
                      <div className="library-image-info">
                        <p className="library-image-title" title={image.alt || 'Sem título'}>
                          {image.alt || 'Sem título'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </Modal>

      {/* Crop Modal */}
      {selectedImageForCrop && (
        <FlexibleImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImageForCrop.url}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
          title={cropTitle}
          initialRatio={initialCropForSelected?.ratio ?? cropRatio}
          initialCropData={initialCropForSelected}
          allowRatioChange={true}
        />
      )}
    </>
  );
}
