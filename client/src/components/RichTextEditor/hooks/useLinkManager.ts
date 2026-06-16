import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { positionFloating } from '@/utils/positionFloating';

export function enforceLinksTarget(root: HTMLElement | null) {
  const anchors = root?.querySelectorAll('a') ?? [];
  anchors.forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}

type UseLinkManagerArgs = {
  editorRef: RefObject<HTMLDivElement | null>;
  captureSelection: () => void;
  restoreSelection: () => void;
  onContentChange: () => void;
};

export function useLinkManager({ editorRef, captureSelection, restoreSelection, onContentChange }: UseLinkManagerArgs) {
  const linkAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const clickedLinkRef = useRef<HTMLAnchorElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
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
  const [linkAnchorRect, setLinkAnchorRect] = useState<{ top: number; left: number } | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(0);
  const [isMeasuring, setIsMeasuring] = useState(false);

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

  const findLinkAtSelection = (): HTMLAnchorElement | null => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!node) return null;
    let current: Node | null = node;
    while (current && current !== editorRef.current) {
      if (current instanceof HTMLAnchorElement) return current;
      current = current.parentNode;
    }
    return null;
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const anchor = findLinkAtSelection();
      if (!anchor && linkPopover.open) {
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [linkPopover.open]);

  const getSelectionText = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount > 0 ? sel.toString() : '';
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

    onContentChange();
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
      onContentChange();
    }
    setShowLinkModal(false);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const positionPopover = () => {
    const anchor = clickedLinkRef.current;
    const pop = popoverRef.current;
    if (!anchor || !pop) return;
    const { top, left, placement, arrowLeft: nextArrowLeft } = positionFloating(anchor.getBoundingClientRect(), pop);
    setArrowLeft(nextArrowLeft);
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
  };

  const openFromAnchorClick = (anchor: HTMLAnchorElement) => {
    ensureExternalLink(anchor);
    captureSelection();
    openLinkPopoverFromAnchor(anchor);
  };

  const closeLinkPopover = () => setLinkPopover((prev) => ({ ...prev, open: false }));

  const handleEditLink = () => {
    setShowLinkModal(true);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const handleRemoveLinkFromPopover = () => {
    removeLink();
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  return {
    popoverRef,
    showLinkModal,
    setShowLinkModal,
    selectedText,
    hasExistingLink,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    linkError,
    linkPopover,
    linkAnchorRect,
    popoverPlacement,
    arrowLeft,
    isMeasuring,
    openLinkModal,
    applyLink,
    removeLink,
    openFromAnchorClick,
    closeLinkPopover,
    handleEditLink,
    handleRemoveLinkFromPopover
  };
}
