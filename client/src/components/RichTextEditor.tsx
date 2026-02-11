import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faHeading,
  faListUl,
  faListOl,
  faQuoteLeft,
  faLink,
  faImage,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faPen,
  faTrash,
  faArrowUpRightFromSquare,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import { fetchMedia, uploadMedia } from '../api/queries';
import type { Media } from '../types';

type Props = {
  value: string;
  onChange: (val: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, onUploadingChange }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const linkAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [hasExistingLink, setHasExistingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPopover, setLinkPopover] = useState<{ open: boolean; href: string; rect: DOMRect | null }>({
    open: false,
    href: '',
    rect: null
  });
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [blockAlign, setBlockAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [linkAnchorRect, setLinkAnchorRect] = useState<{ top: number; left: number } | null>(null);
  const clickedLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(0);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [imagePopover, setImagePopover] = useState<{ open: boolean; rect: DOMRect | null; target?: HTMLElement | null }>(
    { open: false, rect: null, target: null }
  );
  const [activeFigure, setActiveFigure] = useState<HTMLElement | null>(null);
  const [imageMeta, setImageMeta] = useState<{ src: string; alt: string; size: string; align: string } | null>(null);
  const [imagePlacement, setImagePlacement] = useState<'top' | 'bottom'>('top');
  const [imageArrowLeft, setImageArrowLeft] = useState(0);
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
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
  const imageAltInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
    normalizeRootInlineBlocks();
    normalizeImageBlocks();
    normalizeAlignmentBlocks();
    const normalizedHtml = ref.current.innerHTML;
    if (normalizedHtml !== value) {
      onChange(normalizedHtml);
    }
    updateAlignmentState();
    enforceLinksTarget();
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  useEffect(() => {
    if (!showImageModal || media.length) return;
    fetchMedia().then(setMedia).catch(() => {});
  }, [showImageModal, media.length]);

  useEffect(() => {
    if (!showLinkModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowLinkModal(false);
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLinkModal]);

  useEffect(() => {
    if (!linkPopover.open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('a')) return;
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
    };
    const handleScroll = () => setLinkPopover((prev) => ({ ...prev, open: false }));
    const handleResize = () => setLinkPopover((prev) => ({ ...prev, open: false }));
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [linkPopover.open]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const anchor = findLinkAtSelection();
      if (!anchor && linkPopover.open) {
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
      updateAlignmentState();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [linkPopover.open]);

  const handleInput = () => {
    normalizeRootInlineBlocks();
    normalizeImageBlocks();
    normalizeAlignmentBlocks();
    enforceLinksTarget();
    onChange(ref.current?.innerHTML ?? '');
  };

  const captureSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const enforceLinksTarget = () => {
    const anchors = ref.current?.querySelectorAll('a') ?? [];
    anchors.forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (selectionRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(selectionRef.current);
    }
  };

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

  const normalizeImageBlocks = () => {
    const root = ref.current;
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
  };

  const insertFigureHtml = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    handleInput();
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

  const getSelectionText = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount > 0 ? sel.toString() : '';
  };

  const findLinkAtSelection = (): HTMLAnchorElement | null => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!node) return null;
    let current: Node | null = node;
    while (current && current !== ref.current) {
      if (current instanceof HTMLAnchorElement) return current;
      current = current.parentNode;
    }
    return null;
  };

  const openLinkModal = () => {
    captureSelection();
    const selected = getSelectionText();
    const anchor = findLinkAtSelection();
    linkAnchorRef.current = anchor;
    setLinkUrl(anchor?.getAttribute('href') ?? '');
    setLinkText(selected || anchor?.textContent || '');
    setSelectedText(selected || '');
    setHasExistingLink(!!anchor);
    setLinkError(null);
    setShowLinkModal(true);
  };

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  };

  const ensureExternalLink = (anchor: HTMLAnchorElement | null) => {
    if (!anchor) return;
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  };

  const applyLink = () => {
    const normalized = normalizeUrl(linkUrl);
    if (!normalized) {
      setLinkError('Informe uma URL.');
      return;
    }
    restoreSelection();
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;
    const textForInsert = hasSelection ? sel!.toString() : linkText.trim();
    if (!hasSelection && !textForInsert) {
      setLinkError('Selecione um texto ou informe o texto do link.');
      return;
    }

    const anchor = findLinkAtSelection() || linkAnchorRef.current;
    if (anchor && (!hasSelection || anchor.contains(sel?.anchorNode ?? null))) {
      anchor.setAttribute('href', normalized);
      if (textForInsert) anchor.textContent = textForInsert;
      ensureExternalLink(anchor);
    } else if (hasSelection) {
      document.execCommand('createLink', false, normalized);
      ensureExternalLink(findLinkAtSelection());
    } else {
      const html = `<a href="${normalized}" target="_blank" rel="noopener noreferrer">${textForInsert}</a>`;
      document.execCommand('insertHTML', false, html);
    }

    handleInput();
    setShowLinkModal(false);
    setLinkError(null);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const removeLink = () => {
    restoreSelection();
    const anchor = findLinkAtSelection() || linkAnchorRef.current;
    if (anchor && anchor.parentNode) {
      const text = anchor.textContent || '';
      anchor.parentNode.replaceChild(document.createTextNode(text), anchor);
      handleInput();
    }
    setShowLinkModal(false);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const positionPopover = () => {
    const anchor = clickedLinkRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const pop = popoverRef.current;
    if (!pop) return;
    const popWidth = pop.offsetWidth;
    const popHeight = pop.offsetHeight;
    const GAP = 10;
    const VIEWPORT_PADDING = 8;
    const ARROW_PADDING = 14;

    const centerX = rect.left + rect.width / 2;
    const desiredLeft = centerX - popWidth / 2;
    let left = clamp(desiredLeft, VIEWPORT_PADDING, window.innerWidth - popWidth - VIEWPORT_PADDING);
    const safeTop = VIEWPORT_PADDING; // fallback; could be computed from toolbar
    let top = rect.top - popHeight - GAP;
    let placement: 'top' | 'bottom' = 'top';
    if (top < safeTop) {
      top = rect.bottom + GAP;
      placement = 'bottom';
    }
    top = clamp(top, VIEWPORT_PADDING, window.innerHeight - popHeight - VIEWPORT_PADDING);

    const arrowX = clamp(centerX - left, ARROW_PADDING, popWidth - ARROW_PADDING);
    setArrowLeft(arrowX);
    setPopoverPlacement(placement);
    setLinkAnchorRect({ top, left });
  };

  useLayoutEffect(() => {
    if (linkPopover.open) {
      setIsMeasuring(true);
      positionPopover();
      setIsMeasuring(false);
    }
  }, [linkPopover.open, linkPopover.href]);

  const openLinkPopoverFromAnchor = (anchor: HTMLAnchorElement) => {
    clickedLinkRef.current = anchor;
    linkAnchorRef.current = anchor;
    setLinkUrl(anchor.getAttribute('href') ?? '');
    setLinkText(anchor.textContent ?? '');
    setSelectedText(anchor.textContent ?? '');
    setHasExistingLink(true);
    setLinkPopover({ open: true, href: anchor.getAttribute('href') ?? '', rect: anchor.getBoundingClientRect() });
    // position will run in layout effect
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const figure = target.closest('figure[data-type="image"]') as HTMLElement | null;
    if (figure) {
      const img = figure.querySelector('img');
      const size = figure.getAttribute('data-size') ?? '100';
      const align = figure.getAttribute('data-align') ?? 'center';
      setActiveFigure(figure);
      setImageMeta({ src: img?.getAttribute('src') ?? '', alt: img?.getAttribute('alt') ?? '', size, align });
      setLinkPopover((prev) => ({ ...prev, open: false }));
      const rect = figure.getBoundingClientRect();
      positionImagePopover(rect);
      setImagePopover({ open: true, rect, target: figure });
      highlightFigure(figure);
      return;
    }

    setActiveFigure(null);
    setImagePopover({ open: false, rect: null, target: null });
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      ensureExternalLink(anchor);
      captureSelection();
      openLinkPopoverFromAnchor(anchor);
    } else {
      setLinkPopover((prev) => ({ ...prev, open: false }));
    }
  };

  const highlightFigure = (figure: HTMLElement | null) => {
    const figures = ref.current?.querySelectorAll('figure[data-type="image"]') ?? [];
    figures.forEach((f) => f.classList.remove('is-active'));
    if (figure) figure.classList.add('is-active');
  };

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

  const positionImagePopover = (rect: DOMRect | null) => {
    if (!rect || !imagePopoverRef.current) return;
    const pop = imagePopoverRef.current;
    const popWidth = pop.offsetWidth;
    const popHeight = pop.offsetHeight;
    const GAP = 10;
    const VIEWPORT_PADDING = 8;
    const ARROW_PADDING = 14;

    const centerX = rect.left + rect.width / 2;
    const desiredLeft = centerX - popWidth / 2;
    let left = clamp(desiredLeft, VIEWPORT_PADDING, window.innerWidth - popWidth - VIEWPORT_PADDING);
    let top = rect.top - popHeight - GAP;
    let placement: 'top' | 'bottom' = 'top';
    if (top < VIEWPORT_PADDING) {
      top = rect.bottom + GAP;
      placement = 'bottom';
    }
    top = clamp(top, VIEWPORT_PADDING, window.innerHeight - popHeight - VIEWPORT_PADDING);
    const arrowX = clamp(centerX - left, ARROW_PADDING, popWidth - ARROW_PADDING);
    setImageArrowLeft(arrowX);
    setImagePlacement(placement);
    setImagePopover((prev) => ({ ...prev, rect: new DOMRect(left, top, rect.width, rect.height) }));
  };

  useLayoutEffect(() => {
    if (imagePopover.open) {
      positionImagePopover(imagePopover.target?.getBoundingClientRect() ?? imagePopover.rect);
    }
  }, [imagePopover.open]);

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
    // normalize size/align helper classes for public render
    allowedSizes.forEach((s) => activeFigure.classList.remove(`rte-image--size-${s}`));
    activeFigure.classList.add(`rte-image--size-${size}`);
    allowedAligns.forEach((a) => activeFigure.classList.remove(`rte-image--align-${a}`));
    activeFigure.classList.add(`rte-image--align-${align}`);
    setImageMeta((prev) => (prev ? { ...prev, alt: editImageModal.alt, size, align } : prev));
    handleInput();
    setEditImageModal((prev) => ({ ...prev, open: false }));
  };

  const removeImage = () => {
    if (!activeFigure || !ref.current) return;
    if (!window.confirm('Remover esta imagem?')) return;
    activeFigure.remove();
    setImagePopover({ open: false, rect: null, target: null });
    highlightFigure(null);
    handleInput();
  };

  const handleEditLink = () => {
    setShowLinkModal(true);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const handleRemoveLinkFromPopover = () => {
    removeLink();
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const handleUploadNow = async (file: File, alt?: string) => {
    const tempId = crypto.randomUUID();
    insertImage(URL.createObjectURL(file), alt, tempId, 'uploading');
    setShowImageModal(false);
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia({ file, alt });
      const figure = ref.current?.querySelector<HTMLElement>(`figure[data-temp-id="${tempId}"]`);
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
      const figure = ref.current?.querySelector<HTMLElement>(`figure[data-temp-id="${tempId}"]`);
      if (figure) {
        figure.classList.remove('is-uploading');
        figure.classList.add('has-error');
        const overlay = figure.querySelector('.rte-image-overlay');
        if (overlay) overlay.textContent = 'Falha no upload';
      }
    } finally {
      setUploading(false);
      handleInput();
    }
  };

  const ALIGNABLE_BLOCK_SELECTOR = 'p,h1,h2,h3,blockquote,li';
  const IMAGE_BLOCK_SELECTOR = 'figure[data-type="image"], figure.rte-image, img';
  const alignClasses = ['align-left', 'align-center', 'align-right', 'align-justify'] as const;

  const isImageBlock = (el: Element | null) => !!el && (el.matches(IMAGE_BLOCK_SELECTOR) || el.closest(IMAGE_BLOCK_SELECTOR));

  const normalizeRootInlineBlocks = () => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.childNodes);
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (!text) {
          node.parentNode?.removeChild(node);
          return;
        }
        const p = document.createElement('p');
        p.textContent = text;
        root.replaceChild(p, node);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (isImageBlock(el)) return;
        if (el.tagName === 'SPAN' && el.getAttributeNames().length === 0) {
          const p = document.createElement('p');
          p.innerHTML = el.innerHTML;
          root.replaceChild(p, el);
        }
      }
    });
  };

  const closestAlignableBlock = (node: Node | null): HTMLElement | null => {
    const root = ref.current;
    if (!root || !node) return null;
    const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null;
    if (!el) return null;
    const block = el.closest(ALIGNABLE_BLOCK_SELECTOR) as HTMLElement | null;
    if (!block) return null;
    if (!root.contains(block)) return null;
    if (isImageBlock(block)) return null;
    return block;
  };

  const getAlignFromClass = (el: HTMLElement): 'left' | 'center' | 'right' | 'justify' | null => {
    if (el.classList.contains('align-center')) return 'center';
    if (el.classList.contains('align-right')) return 'right';
    if (el.classList.contains('align-justify')) return 'justify';
    if (el.classList.contains('align-left')) return 'left';
    return null;
  };

  const normalizeAlignFromStyle = (el: HTMLElement): 'left' | 'center' | 'right' | 'justify' | null => {
    const val = (el.style.textAlign || '').toLowerCase();
    if (['left', 'start'].includes(val)) return 'left';
    if (['center', 'middle'].includes(val)) return 'center';
    if (['right', 'end'].includes(val)) return 'right';
    if (val === 'justify') return 'justify';
    return null;
  };

  const applyAlignClass = (el: HTMLElement, align: 'left' | 'center' | 'right' | 'justify') => {
    alignClasses.forEach((cls) => el.classList.remove(cls));
    el.classList.add(`align-${align}`);
    el.setAttribute('data-align', align);
    el.style.removeProperty('text-align');
  };

  const normalizeAlignmentBlocks = () => {
    const root = ref.current;
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>(ALIGNABLE_BLOCK_SELECTOR));
    blocks.forEach((block) => {
      if (isImageBlock(block)) return;
      const classAlign = getAlignFromClass(block);
      const dataAlign = block.getAttribute('data-align') as 'left' | 'center' | 'right' | 'justify' | null;
      const styleAlign = normalizeAlignFromStyle(block);
      const align = classAlign || dataAlign || styleAlign;
      if (align) applyAlignClass(block, align);
    });
  };

  const collectBlocksInRange = (range: Range): HTMLElement[] => {
    const root = ref.current;
    if (!root) return [];
    if (range.collapsed) {
      const block = closestAlignableBlock(range.startContainer);
      return block ? [block] : [];
    }
    const unique = new Set<HTMLElement>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const el = node as HTMLElement;
        if (!el.matches(ALIGNABLE_BLOCK_SELECTOR)) return NodeFilter.FILTER_SKIP;
        if (isImageBlock(el)) return NodeFilter.FILTER_REJECT;
        try {
          return range.intersectsNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      }
    });
    while (walker.nextNode()) {
      unique.add(walker.currentNode as HTMLElement);
    }
    if (unique.size === 0) {
      const fallback = closestAlignableBlock(range.startContainer);
      if (fallback) unique.add(fallback);
    }
    return Array.from(unique);
  };

  const updateAlignmentState = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const block = closestAlignableBlock(sel.getRangeAt(0).startContainer);
    if (!block) return;
    const classAlign = getAlignFromClass(block);
    if (classAlign) {
      setBlockAlign(classAlign);
      return;
    }
    const fallbackAlign = (getComputedStyle(block).textAlign as 'left' | 'center' | 'right' | 'justify') || 'left';
    setBlockAlign(fallbackAlign);
  };

  const applyAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const blocks = collectBlocksInRange(range);
    if (!blocks.length) return;
    blocks.forEach((block) => applyAlignClass(block, align));
    setBlockAlign(align);
    handleInput();
  };

  const toolbarGroups: {
    key: string;
    label: ReactNode;
    title: string;
    action: () => void;
  }[][] = [
    [
      { key: 'bold', label: <FontAwesomeIcon icon={faBold} />, title: 'Negrito', action: () => document.execCommand('bold') },
      { key: 'italic', label: <FontAwesomeIcon icon={faItalic} />, title: 'Itálico', action: () => document.execCommand('italic') }
    ],
    [
      {
        key: 'p',
        label: (
          <span className="rte-heading-icon">
            P
          </span>
        ),
        title: 'Parágrafo / Texto normal',
        action: () => document.execCommand('formatBlock', false, 'P')
      },
      {
        key: 'h2',
        label: (
          <span className="rte-heading-icon">
            <FontAwesomeIcon icon={faHeading} />
            <small>2</small>
          </span>
        ),
        title: 'Título 2',
        action: () => document.execCommand('formatBlock', false, 'H2')
      },
      {
        key: 'h3',
        label: (
          <span className="rte-heading-icon">
            <FontAwesomeIcon icon={faHeading} />
            <small>3</small>
          </span>
        ),
        title: 'Título 3',
        action: () => document.execCommand('formatBlock', false, 'H3')
      }
    ],
    [
      { key: 'ul', label: <FontAwesomeIcon icon={faListUl} />, title: 'Lista', action: () => document.execCommand('insertUnorderedList') },
      { key: 'ol', label: <FontAwesomeIcon icon={faListOl} />, title: 'Lista numerada', action: () => document.execCommand('insertOrderedList') }
    ],
    [{ key: 'quote', label: <FontAwesomeIcon icon={faQuoteLeft} />, title: 'Citação', action: () => document.execCommand('formatBlock', false, 'BLOCKQUOTE') }],
    [
      { key: 'align-left', label: <FontAwesomeIcon icon={faAlignLeft} />, title: 'Alinhar à esquerda', action: () => applyAlignment('left') },
      { key: 'align-center', label: <FontAwesomeIcon icon={faAlignCenter} />, title: 'Centralizar', action: () => applyAlignment('center') },
      { key: 'align-right', label: <FontAwesomeIcon icon={faAlignRight} />, title: 'Alinhar à direita', action: () => applyAlignment('right') },
      { key: 'align-justify', label: <FontAwesomeIcon icon={faAlignJustify} />, title: 'Justificar', action: () => applyAlignment('justify') }
    ],
    [
      {
        key: 'link',
        label: <FontAwesomeIcon icon={faLink} />,
        title: 'Inserir link',
        action: openLinkModal
      }
    ],
    [
      {
        key: 'image',
        label: <FontAwesomeIcon icon={faImage} />,
        title: 'Inserir imagem',
        action: () => {
          captureSelection();
          setShowImageModal(true);
          setActiveTab('library');
        }
      }
    ]
  ];

  return (
    <div className="rte-shell">
      <div className="rte-toolbar">
        {toolbarGroups.map((group) => (
          <div key={group.map((g) => g.key).join('-')} className="rte-toolbar-group">
            {group.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rte-btn ${
                  item.key.startsWith('align') && ((item.key === 'align-left' && blockAlign === 'left') ||
                    (item.key === 'align-center' && blockAlign === 'center') ||
                    (item.key === 'align-right' && blockAlign === 'right') ||
                    (item.key === 'align-justify' && blockAlign === 'justify'))
                    ? 'is-active'
                    : ''
                }`}
                aria-label={item.title}
                title={item.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  item.action();
                  handleInput();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={ref}
        onInput={handleInput}
        onClick={handleEditorClick}
        contentEditable
        className="rte-editor"
        suppressContentEditableWarning
      />

      {imagePopover.open && imageMeta &&
        createPortal(
          <div
            ref={imagePopoverRef}
            className="rte-image-popover"
            style={{
              position: 'fixed',
              top: imagePopover.rect?.y ?? 0,
              left: imagePopover.rect?.x ?? 0,
              opacity: imagePopover.rect ? 1 : 0
            }}
          >
            <div
              className={`rte-popover-arrow ${imagePlacement === 'bottom' ? 'is-bottom' : 'is-top'}`}
              style={{ left: imageArrowLeft }}
            />
            <button
              type="button"
              className="rte-popover-btn"
              aria-label="Visualizar imagem"
              title="Visualizar imagem"
              onClick={openImageLightbox}
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
            <button
              type="button"
              className="rte-popover-btn tone-info"
              aria-label="Editar imagem"
              title="Editar imagem"
              onClick={openImageEditModal}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              type="button"
              className="rte-popover-btn tone-danger"
              aria-label="Remover imagem"
              title="Remover imagem"
              onClick={removeImage}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>,
          document.body
        )}

      {linkPopover.open &&
        createPortal(
          <div
            ref={popoverRef}
            className="rte-link-popover"
            style={{
              position: 'fixed',
              top: linkAnchorRect?.top ?? 0,
              left: linkAnchorRect?.left ?? 0,
              opacity: isMeasuring || !linkAnchorRect ? 0 : 1,
              pointerEvents: isMeasuring || !linkAnchorRect ? 'none' : 'auto'
            }}
          >
            <div
              className={`rte-popover-arrow ${popoverPlacement === 'bottom' ? 'is-bottom' : 'is-top'}`}
              style={{ left: arrowLeft }}
            />
            <button
              type="button"
              className="rte-popover-btn"
              aria-label="Abrir em nova aba"
              title="Abrir em nova aba"
              onClick={() => linkPopover.href && window.open(linkPopover.href, '_blank')}
              disabled={!linkPopover.href}
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </button>
            <button
              type="button"
              className="rte-popover-btn tone-info"
              aria-label="Editar link"
              title="Editar link"
              onClick={handleEditLink}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              type="button"
              className="rte-popover-btn tone-danger"
              aria-label="Remover link"
              title="Remover link"
              onClick={handleRemoveLinkFromPopover}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>,
          document.body
        )
      }

      {showImageModal && (
        <div className="rte-modal-backdrop" onClick={() => setShowImageModal(false)}>
          <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rte-modal-tabs">
              <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>
                Biblioteca
              </button>
              <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>
                Enviar agora
              </button>
            </div>
            {activeTab === 'library' && (
              <div className="rte-library">
                <input
                  placeholder="Buscar por alt"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <div className="rte-library-grid">
                  {media
                    .filter((m) => (m.alt ?? '').toLowerCase().includes(search.toLowerCase()))
                    .map((m) => (
                      <button key={m.id} type="button" className="rte-media-card" onClick={() => handleSelectFromLibrary(m)}>
                        <img src={m.url} alt={m.alt ?? m.id} />
                        <span className="muted small">{m.alt || 'Sem alt'}</span>
                      </button>
                    ))}
                  {media.length === 0 && <div className="muted">Nenhuma mídia encontrada.</div>}
                </div>
              </div>
            )}
            {activeTab === 'upload' && (
              <div className="rte-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const alt = prompt('Texto alternativo da imagem') ?? '';
                      captureSelection();
                      handleUploadNow(file, alt);
                      e.target.value = '';
                    }
                  }}
                />
                {uploadError && <div className="admin-empty" role="alert">{uploadError}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="rte-modal-backdrop" onClick={() => setShowLinkModal(false)}>
          <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rte-modal-header">
              <div>
                <strong>Inserir/Editar link</strong>
                <p className="muted small" style={{ margin: '0.1rem 0 0' }}>Use https:// ou cole uma URL completa.</p>
              </div>
            </div>
            <div className="rte-modal-body">
              <div className="rte-field">
                <label>URL *</label>
                <input
                  className="rte-input"
                  placeholder="https://exemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                  autoFocus
                />
                {linkError && <div className="rte-error">{linkError}</div>}
              </div>
              <div className="rte-field">
                <label>Texto do link (opcional)</label>
                <input
                  className="rte-input"
                  placeholder="Texto a ser exibido"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
                {selectedText && (
                  <p className="muted small">Texto selecionado: {selectedText}</p>
                )}
              </div>
            </div>
            <div className="rte-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowLinkModal(false)}>
                Cancelar
              </button>
              {hasExistingLink && (
                <button type="button" className="btn btn-outline tone-danger" onClick={removeLink}>
                  Remover link
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={applyLink}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox?.open && (
        <div className="rte-lightbox" onClick={() => setLightbox(null)}>
          <div className="rte-lightbox-content" role="dialog" aria-label="Visualizar imagem">
            <button className="rte-lightbox-close" aria-label="Fechar" onClick={() => setLightbox(null)}>
              ×
            </button>
            <div className="rte-lightbox-media">
              <img src={lightbox.src} alt={lightbox.alt} />
              {lightbox.alt && <p className="muted small" style={{ marginTop: '0.5rem', textAlign: 'center' }}>{lightbox.alt}</p>}
            </div>
          </div>
        </div>
      )}

      {editImageModal.open && (
        <div
          className="rte-modal-backdrop"
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            setEditImageModal((prev) => ({ ...prev, open: false }));
          }}
        >
          <div
            className="rte-modal rte-modal-edit-image"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rte-modal-header">
              <div>
                <strong>Editar imagem</strong>
                <p className="muted small" style={{ margin: '0.1rem 0 0' }}>Atualize alt, tamanho e alinhamento.</p>
              </div>
            </div>
            <div className="rte-modal-body rte-modal-body-scroll">
              <div className="rte-field">
                <label>Título / Alt</label>
                <input
                  ref={imageAltInputRef}
                  className="rte-input"
                  value={editImageModal.alt}
                  onChange={(e) => setEditImageModal((prev) => ({ ...prev, alt: e.target.value }))}
                  placeholder="Texto alternativo (recomendado)"
                  autoFocus
                />
                <p className="muted small">Ajuda na acessibilidade e SEO.</p>
              </div>
              <div className="rte-field">
                <label>Tamanho</label>
                <div className="rte-segmented">
                  {['25', '50', '75', '100'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={editImageModal.size === size ? 'active' : ''}
                      onClick={() => setEditImageModal((prev) => ({ ...prev, size }))}
                      aria-label={`Largura ${size}%`}
                    >
                      {size}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="rte-field">
                <label>Alinhamento</label>
                <div className="rte-segmented">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      type="button"
                      className={editImageModal.align === align ? 'active' : ''}
                      onClick={() => setEditImageModal((prev) => ({ ...prev, align }))}
                      aria-label={`Alinhar ${align}`}
                    >
                      {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rte-field">
                <label>Preview</label>
                <div className="rte-image-preview">
                  <img src={editImageModal.src} alt={editImageModal.alt} />
                </div>
              </div>
            </div>
            <div className="rte-modal-footer rte-modal-footer-sticky">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setEditImageModal((prev) => ({ ...prev, open: false }))}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={applyImageEdits}
                disabled={
                  editImageModal.alt === editImageModal.baseAlt &&
                  editImageModal.size === editImageModal.baseSize &&
                  editImageModal.align === editImageModal.baseAlign
                }
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
