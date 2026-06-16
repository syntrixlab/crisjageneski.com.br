import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ConfirmModal, Modal } from '../AdminUI';
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
  faAlignJustify
} from '@fortawesome/free-solid-svg-icons';
import { useLinkManager, enforceLinksTarget } from './hooks/useLinkManager';
import { useImageManager, normalizeImageBlocks } from './hooks/useImageManager';
import { RteLinkPopover } from './RteLinkPopover';
import { RteImagePopover } from './RteImagePopover';
import { RteLinkModal } from './RteLinkModal';
import { RteImageModal } from './RteImageModal';
import { RteLightbox } from './RteLightbox';
import { RteImageEditModal } from './RteImageEditModal';

type Props = {
  value: string;
  onChange: (val: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  placeholder?: string;
};

const ALIGNABLE_BLOCK_SELECTOR = 'p,h1,h2,h3,blockquote,li';
const IMAGE_BLOCK_SELECTOR = 'figure[data-type="image"], figure.rte-image, img';
const alignClasses = ['align-left', 'align-center', 'align-right', 'align-justify'] as const;

export function RichTextEditor({ value, onChange, onUploadingChange }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [blockAlign, setBlockAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [authorModal, setAuthorModal] = useState<{ open: boolean; value: string }>({ open: false, value: '' });

  const captureSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (selectionRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(selectionRef.current);
    }
  };

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

  const handleInput = () => {
    normalizeRootInlineBlocks();
    normalizeImageBlocks(ref.current);
    normalizeAlignmentBlocks();
    enforceLinksTarget(ref.current);
    onChange(ref.current?.innerHTML ?? '');
  };

  const linkManager = useLinkManager({ editorRef: ref, captureSelection, restoreSelection, onContentChange: handleInput });
  const imageManager = useImageManager({ editorRef: ref, restoreSelection, onContentChange: handleInput });

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
    normalizeRootInlineBlocks();
    normalizeImageBlocks(ref.current);
    normalizeAlignmentBlocks();
    const normalizedHtml = ref.current.innerHTML;
    if (normalizedHtml !== value) {
      onChange(normalizedHtml);
    }
    updateAlignmentState();
    enforceLinksTarget(ref.current);
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(imageManager.uploading);
  }, [imageManager.uploading, onUploadingChange]);

  useEffect(() => {
    const handleSelectionChange = () => updateAlignmentState();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const figure = target.closest('figure[data-type="image"]') as HTMLElement | null;
    if (figure) {
      linkManager.closeLinkPopover();
      imageManager.openFromFigureClick(figure);
      return;
    }

    imageManager.closeImagePopover();
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      linkManager.openFromAnchorClick(anchor);
    } else {
      linkManager.closeLinkPopover();
    }
  };

  const appendWithSeparator = (block: HTMLElement, node: Node) => {
    const lastNode = block.lastChild;
    if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
      const text = lastNode.textContent ?? '';
      if (text && !/\s$/.test(text)) {
        block.appendChild(document.createTextNode(' '));
      }
    } else if (lastNode instanceof HTMLElement && lastNode.tagName !== 'BR') {
      block.appendChild(document.createTextNode(' '));
    }
    block.appendChild(node);
  };

  const escapeHtml = (text: string) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const requestInsertQuoteAuthor = () => {
    captureSelection();
    setAuthorModal({ open: true, value: '' });
  };

  const applyQuoteAuthor = () => {
    const author = authorModal.value.trim();
    if (!author) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setAuthorModal({ open: false, value: '' });
      return;
    }
    const block = closestAlignableBlock(sel.getRangeAt(0).startContainer);

    if (block && /^H[1-3]$/.test(block.tagName)) {
      const existing = Array.from(block.children).find((child) => child.classList.contains('rte-author'));
      const authorNode = document.createElement('span');
      authorNode.className = 'rte-author';
      authorNode.setAttribute('data-type', 'quote-author');
      authorNode.textContent = author;
      if (existing) {
        block.replaceChild(authorNode, existing);
      } else {
        block.appendChild(authorNode);
      }
      handleInput();
      setAuthorModal({ open: false, value: '' });
      return;
    }

    if (block && ['P', 'BLOCKQUOTE', 'LI'].includes(block.tagName)) {
      const authorNode = document.createElement('strong');
      authorNode.className = 'rte-author-inline';
      authorNode.setAttribute('data-type', 'quote-author-inline');
      authorNode.textContent = author;
      appendWithSeparator(block, authorNode);
      handleInput();
      setAuthorModal({ open: false, value: '' });
      return;
    }

    const safeAuthor = escapeHtml(author);
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<strong class="rte-author-inline" data-type="quote-author-inline">${safeAuthor}</strong>`
    );
    handleInput();
    setAuthorModal({ open: false, value: '' });
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
        action: linkManager.openLinkModal
      }
    ],
    [
      {
        key: 'author',
        label: <span className="rte-heading-icon">Au</span>,
        title: 'Inserir autor da frase',
        action: requestInsertQuoteAuthor
      }
    ],
    [
      {
        key: 'image',
        label: <FontAwesomeIcon icon={faImage} />,
        title: 'Inserir imagem',
        action: () => {
          captureSelection();
          imageManager.openImageModal();
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

      <RteImagePopover imageManager={imageManager} />
      <RteLinkPopover linkManager={linkManager} />
      <RteImageModal imageManager={imageManager} captureSelection={captureSelection} />
      <RteLinkModal linkManager={linkManager} />
      <RteLightbox imageManager={imageManager} />
      <RteImageEditModal imageManager={imageManager} />

      <ConfirmModal
        isOpen={imageManager.confirmRemoveImage}
        title="Remover imagem"
        description="Tem certeza que deseja remover esta imagem do editor?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={imageManager.executeRemoveImage}
        onClose={() => imageManager.setConfirmRemoveImage(false)}
      />

      <Modal
        isOpen={authorModal.open}
        title="Inserir autor"
        description="O nome será inserido como atribuição após o texto selecionado."
        onClose={() => setAuthorModal({ open: false, value: '' })}
        width={400}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setAuthorModal({ open: false, value: '' })}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={applyQuoteAuthor}
              disabled={!authorModal.value.trim()}
            >
              Inserir
            </button>
          </div>
        }
      >
        <input
          className="rte-input"
          style={{ width: '100%' }}
          placeholder="Ex: Carl Jung"
          value={authorModal.value}
          autoFocus
          onChange={(e) => setAuthorModal((prev) => ({ ...prev, value: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyQuoteAuthor();
            }
            if (e.key === 'Escape') {
              setAuthorModal({ open: false, value: '' });
            }
          }}
        />
      </Modal>
    </div>
  );
}
