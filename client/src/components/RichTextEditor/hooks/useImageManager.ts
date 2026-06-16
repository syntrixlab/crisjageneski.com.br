import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { fetchMedia, uploadMedia } from '@/api/queries';
import type { Media } from '@/types';
import { positionFloating } from '@/utils/positionFloating';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

const isValidSize = (size?: string | null): size is (typeof allowedSizes)[number] =>
  allowedSizes.includes((size ?? '') as (typeof allowedSizes)[number]);

const isValidAlign = (align?: string | null): align is (typeof allowedAligns)[number] =>
  allowedAligns.includes((align ?? '') as (typeof allowedAligns)[number]);

const getFigureSize = (figure: HTMLElement): (typeof allowedSizes)[number] => {
  const dataSize = figure.getAttribute('data-size');
  if (isValidSize(dataSize)) return dataSize;
  const sizeFromClass =
    Array.from(figure.classList)
      .find((cls) => cls.startsWith('rte-image--size-'))
      ?.replace('rte-image--size-', '') ?? null;
  if (isValidSize(sizeFromClass)) return sizeFromClass;
  return '100';
};

const getFigureAlign = (figure: HTMLElement): (typeof allowedAligns)[number] => {
  const dataAlign = figure.getAttribute('data-align');
  if (isValidAlign(dataAlign)) return dataAlign;
  const alignClass =
    Array.from(figure.classList).find((cls) => cls.startsWith('rte-image--align-')) ||
    Array.from(figure.classList).find((cls) => cls.startsWith('img-align-'));
  const alignValue = alignClass?.replace('rte-image--align-', '').replace('img-align-', '') ?? null;
  if (isValidAlign(alignValue)) return alignValue;
  return 'center';
};

export function normalizeImageBlocks(root: HTMLElement | null) {
  if (!root) return;
  const figures = Array.from(root.querySelectorAll<HTMLElement>('figure'));
  figures.forEach((figure) => {
    const img = figure.querySelector('img');
    if (!img) return;
    const size = getFigureSize(figure);
    const align = getFigureAlign(figure);
    figure.setAttribute('data-type', figure.getAttribute('data-type') ?? 'image');
    figure.setAttribute('data-size', size);
    figure.setAttribute('data-align', align);
    if (!figure.classList.contains('rte-image')) figure.classList.add('rte-image');
    allowedSizes.forEach((s) => figure.classList.remove(`rte-image--size-${s}`));
    figure.classList.add(`rte-image--size-${size}`);
    allowedAligns.forEach((a) => {
      figure.classList.remove(`rte-image--align-${a}`);
      figure.classList.remove(`img-align-${a}`);
    });
    figure.classList.add(`rte-image--align-${align}`, `img-align-${align}`);
  });
}

type UseImageManagerArgs = {
  editorRef: RefObject<HTMLDivElement | null>;
  restoreSelection: () => void;
  onContentChange: () => void;
};

export function useImageManager({ editorRef, restoreSelection, onContentChange }: UseImageManagerArgs) {
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
  const imageAltInputRef = useRef<HTMLInputElement | null>(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState('');
  const [imagePopover, setImagePopover] = useState<{ open: boolean; rect: DOMRect | null; target?: HTMLElement | null }>(
    { open: false, rect: null, target: null }
  );
  const [activeFigure, setActiveFigure] = useState<HTMLElement | null>(null);
  const [imageMeta, setImageMeta] = useState<{ src: string; alt: string; size: string; align: string } | null>(null);
  const [imagePlacement, setImagePlacement] = useState<'top' | 'bottom'>('top');
  const [imageArrowLeft, setImageArrowLeft] = useState(0);
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string } | null>(null);
  const [editImageModal, setEditImageModal] = useState<{
    open: boolean;
    src: string;
    alt: string;
    size: string;
    align: string;
    baseAlt: string;
    baseSize: string;
    baseAlign: string;
  }>({ open: false, src: '', alt: '', size: '100', align: 'center', baseAlt: '', baseSize: '100', baseAlign: 'center' });
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);

  useEffect(() => {
    if (!showImageModal || media.length) return;
    fetchMedia().then(setMedia).catch(() => {});
  }, [showImageModal, media.length]);

  const openImageModal = () => {
    setShowImageModal(true);
    setActiveTab('library');
    setUploadAlt('');
  };

  const insertFigureHtml = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    onContentChange();
  };

  const insertImage = (src: string, alt?: string, tempId?: string, state?: 'uploading' | 'error') => {
    const html = `
      <figure class="rte-image rte-image--size-100 rte-image--align-center img-align-center ${
        state === 'uploading' ? 'is-uploading' : ''
      } ${state === 'error' ? 'has-error' : ''}" ${
        tempId ? `data-temp-id="${tempId}"` : ''
      } data-type="image" data-size="100" data-align="center">
        <img src="${src}" alt="${alt ?? ''}" />
        <figcaption contenteditable="true">${alt ?? ''}</figcaption>
        ${state === 'uploading' ? '<div class="rte-image-overlay">Enviando...</div>' : ''}
        ${state === 'error' ? '<div class="rte-image-overlay error">Falha no upload</div>' : ''}
      </figure>
    `;
    insertFigureHtml(html);
  };

  const handleSelectFromLibrary = (item: Media) => {
    insertImage(item.url, item.alt ?? item.id);
    setShowImageModal(false);
  };

  const handleUploadNow = async (file: File, alt?: string) => {
    const tempId = crypto.randomUUID();
    insertImage(URL.createObjectURL(file), alt, tempId, 'uploading');
    setShowImageModal(false);
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia({ file, alt });
      const figure = editorRef.current?.querySelector<HTMLElement>(`figure[data-temp-id="${tempId}"]`);
      if (figure) {
        const img = figure.querySelector('img');
        const caption = figure.querySelector('figcaption');
        if (img) {
          img.src = uploaded.url;
          img.alt = uploaded.alt ?? alt ?? '';
        }
        if (caption) caption.textContent = uploaded.alt ?? alt ?? '';
        figure.classList.remove('is-uploading', 'has-error');
        figure.removeAttribute('data-temp-id');
        figure.querySelector('.rte-image-overlay')?.remove();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
      const figure = editorRef.current?.querySelector<HTMLElement>(`figure[data-temp-id="${tempId}"]`);
      if (figure) {
        figure.classList.remove('is-uploading');
        figure.classList.add('has-error');
        const overlay = figure.querySelector('.rte-image-overlay');
        if (overlay) overlay.textContent = 'Falha no upload';
      }
    } finally {
      setUploading(false);
      onContentChange();
    }
  };

  const highlightFigure = (figure: HTMLElement | null) => {
    const figures = editorRef.current?.querySelectorAll('figure[data-type="image"]') ?? [];
    figures.forEach((f) => f.classList.remove('is-active'));
    if (figure) figure.classList.add('is-active');
  };

  const positionImagePopover = (rect: DOMRect | null) => {
    if (!rect || !imagePopoverRef.current) return;
    const { top, left, placement, arrowLeft } = positionFloating(rect, imagePopoverRef.current);
    setImageArrowLeft(arrowLeft);
    setImagePlacement(placement);
    setImagePopover((prev) => ({ ...prev, rect: new DOMRect(left, top, rect.width, rect.height) }));
  };

  useLayoutEffect(() => {
    if (imagePopover.open) {
      positionImagePopover(imagePopover.target?.getBoundingClientRect() ?? imagePopover.rect);
    }
  }, [imagePopover.open]);

  useEffect(() => {
    if (!imagePopover.open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (imagePopoverRef.current && !imagePopoverRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('figure[data-type="image"]')) return;
        setImagePopover({ open: false, rect: null, target: null });
        highlightFigure(null);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagePopover({ open: false, rect: null, target: null });
        highlightFigure(null);
      }
    };
    const handleScroll = () => setImagePopover((prev) => ({ ...prev, open: false }));
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [imagePopover.open]);

  const openFromFigureClick = (figure: HTMLElement) => {
    const img = figure.querySelector('img');
    const size = figure.getAttribute('data-size') ?? '100';
    const align = figure.getAttribute('data-align') ?? 'center';
    setActiveFigure(figure);
    setImageMeta({ src: img?.getAttribute('src') ?? '', alt: img?.getAttribute('alt') ?? '', size, align });
    const rect = figure.getBoundingClientRect();
    positionImagePopover(rect);
    setImagePopover({ open: true, rect, target: figure });
    highlightFigure(figure);
  };

  const closeImagePopover = () => {
    setActiveFigure(null);
    setImagePopover({ open: false, rect: null, target: null });
  };

  const openImageLightbox = () => {
    if (imageMeta?.src) {
      setLightbox({ open: true, src: imageMeta.src, alt: imageMeta.alt });
    }
  };

  const openImageEditModal = () => {
    if (!imageMeta) return;
    setEditImageModal({
      open: true,
      src: imageMeta.src,
      alt: imageMeta.alt,
      size: imageMeta.size,
      align: imageMeta.align,
      baseAlt: imageMeta.alt,
      baseSize: imageMeta.size,
      baseAlign: imageMeta.align
    });
    setImagePopover((prev) => ({ ...prev, open: false }));
  };

  const applyImageEdits = () => {
    if (!activeFigure) return;
    const size = isValidSize(editImageModal.size) ? editImageModal.size : '100';
    const align = isValidAlign(editImageModal.align) ? editImageModal.align : 'center';
    const img = activeFigure.querySelector('img');
    const caption = activeFigure.querySelector('figcaption');
    if (img) img.alt = editImageModal.alt;
    if (caption) caption.textContent = editImageModal.alt;
    activeFigure.setAttribute('data-size', size);
    activeFigure.setAttribute('data-align', align);
    activeFigure.setAttribute('data-type', activeFigure.getAttribute('data-type') ?? 'image');
    allowedAligns.forEach((a) => activeFigure.classList.remove(`img-align-${a}`));
    activeFigure.classList.add(`img-align-${align}`);
    allowedSizes.forEach((s) => activeFigure.classList.remove(`rte-image--size-${s}`));
    activeFigure.classList.add(`rte-image--size-${size}`);
    allowedAligns.forEach((a) => activeFigure.classList.remove(`rte-image--align-${a}`));
    activeFigure.classList.add(`rte-image--align-${align}`);
    setImageMeta((prev) => (prev ? { ...prev, alt: editImageModal.alt, size, align } : prev));
    onContentChange();
    setEditImageModal((prev) => ({ ...prev, open: false }));
  };

  const requestRemoveImage = () => {
    if (!activeFigure) return;
    setImagePopover({ open: false, rect: null, target: null });
    setConfirmRemoveImage(true);
  };

  const executeRemoveImage = () => {
    if (!activeFigure) return;
    activeFigure.remove();
    highlightFigure(null);
    onContentChange();
    setConfirmRemoveImage(false);
  };

  return {
    imagePopoverRef,
    imageAltInputRef,
    showImageModal,
    setShowImageModal,
    media,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    uploading,
    uploadError,
    uploadAlt,
    setUploadAlt,
    imagePopover,
    imageMeta,
    imagePlacement,
    imageArrowLeft,
    lightbox,
    setLightbox,
    editImageModal,
    setEditImageModal,
    confirmRemoveImage,
    setConfirmRemoveImage,
    openImageModal,
    handleSelectFromLibrary,
    handleUploadNow,
    openFromFigureClick,
    closeImagePopover,
    openImageLightbox,
    openImageEditModal,
    applyImageEdits,
    requestRemoveImage,
    executeRemoveImage
  };
}
