# RichTextEditor → Tiptap Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `document.execCommand`-based implementation inside `client/src/components/RichTextEditor/` with Tiptap, while keeping the component's public API (`value`/`onChange`/`onUploadingChange`/`placeholder`) and the exact HTML it reads/writes (`<figure class="rte-image ...">`, `<span class="rte-author">`, `<strong class="rte-author-inline">`, `align-*` classes) **byte-for-byte compatible** with what's already saved in the database — no server changes, no DB migration, no changes to `PageRenderer`/`ArticlePage`/block renderers.

**Architecture:** Three custom Tiptap extensions (`imageFigure`, `authorAttribution`, `textAlign`) replicate the legacy HTML schema via `parseHTML`/`renderHTML`. `@tiptap/starter-kit` covers bold/italic/paragraph/heading/lists/blockquote/link natively. The existing `useLinkManager`/`useImageManager` hooks and all 6 popover/modal components (`RteLinkPopover`, `RteImagePopover`, `RteLinkModal`, `RteImageModal`, `RteLightbox`, `RteImageEditModal`) are **kept with the exact same exported shape**, so only the two hooks' internals and `index.tsx` need rewriting — the 6 component files don't change at all. Click-based popover detection (`target.closest('a')` / `target.closest('figure[data-type="image"]')`) is kept as-is since Tiptap renders normal DOM.

**Tech Stack:** `@tiptap/react` 3.26.1, `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/html` (dev, for tests), `vitest` + `jsdom` (new for `client/`).

---

## File Structure

| File | Responsibility |
|---|---|
| `client/vitest.config.ts` | New — vitest config for `client/` (jsdom env, `@/` alias) |
| `client/src/components/RichTextEditor/extensions/imageFigure.ts` | Custom Tiptap node for the image figure |
| `client/src/components/RichTextEditor/extensions/imageFigure.test.ts` | Round-trip tests |
| `client/src/components/RichTextEditor/extensions/authorAttribution.ts` | Custom Tiptap node for quote-author attribution |
| `client/src/components/RichTextEditor/extensions/authorAttribution.test.ts` | Round-trip tests |
| `client/src/components/RichTextEditor/extensions/textAlign.ts` | Custom Tiptap extension for class-based alignment |
| `client/src/components/RichTextEditor/extensions/textAlign.test.ts` | Round-trip tests |
| `client/src/components/RichTextEditor/hooks/useImageManager.ts` | Rewritten: same exported shape, internals use Tiptap commands |
| `client/src/components/RichTextEditor/hooks/useLinkManager.ts` | Rewritten: same exported shape, internals use Tiptap commands |
| `client/src/components/RichTextEditor/index.tsx` | Rewritten: `useEditor`/`EditorContent` instead of a raw `contentEditable` div |
| `client/src/components/RichTextEditor/RteImageModal.tsx`, `RteLinkModal.tsx`, `RteLightbox.tsx`, `RteImageEditModal.tsx`, `RteLinkPopover.tsx`, `RteImagePopover.tsx` | **Not modified** |

---

## Task 1: Install dependencies and configure vitest for `client/`

**Files:**
- Modify: `client/package.json`
- Create: `client/vitest.config.ts`

- [ ] **Step 1: Install Tiptap**

Run: `cd client && npm install @tiptap/react@^3.26.1 @tiptap/core@^3.26.1 @tiptap/starter-kit@^3.26.1`

- [ ] **Step 2: Install test tooling**

Run: `cd client && npm install -D vitest@^4 jsdom @tiptap/html@^3.26.1`

- [ ] **Step 3: Add test scripts**

In `client/package.json`, add to `"scripts"` (next to `"lint"`):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Create `client/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 5: Verify vitest runs (no tests yet, should report 0 files)**

Run: `cd client && npx vitest run`
Expected: `No test files found` (or similar) — confirms config loads without error.

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/vitest.config.ts
git commit -m "chore(client): adicionar Tiptap e configurar vitest"
```

---

## Task 2: `imageFigure` extension (TDD)

**Files:**
- Create: `client/src/components/RichTextEditor/extensions/imageFigure.ts`
- Create: `client/src/components/RichTextEditor/extensions/imageFigure.test.ts`

- [ ] **Step 1: Write the failing round-trip tests**

```typescript
// client/src/components/RichTextEditor/extensions/imageFigure.test.ts
import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ImageFigure } from './imageFigure';

const extensions = [Document, Paragraph, Text, ImageFigure];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('ImageFigure round-trip', () => {
  it('preserves a figure that already has data-size/data-align (current normalized format)', () => {
    const html =
      '<figure class="rte-image rte-image--size-50 rte-image--align-right img-align-right" data-type="image" data-size="50" data-align="right"><img src="https://x.com/a.png" alt="Foto"><figcaption contenteditable="true">Foto</figcaption></figure>';
    expect(roundTrip(html)).toBe(html);
  });

  it('falls back to classes when data-size/data-align are missing (legacy pre-normalization content)', () => {
    const html =
      '<figure class="rte-image rte-image--size-25 rte-image--align-left" data-type="image"><img src="https://x.com/b.png" alt="B"><figcaption contenteditable="true">B</figcaption></figure>';
    const expected =
      '<figure class="rte-image rte-image--size-25 rte-image--align-left img-align-left" data-type="image" data-size="25" data-align="left"><img src="https://x.com/b.png" alt="B"><figcaption contenteditable="true">B</figcaption></figure>';
    expect(roundTrip(html)).toBe(expected);
  });

  it('defaults to size 100 / align center when nothing is present', () => {
    const html = '<figure data-type="image"><img src="https://x.com/c.png" alt=""><figcaption contenteditable="true"></figcaption></figure>';
    const expected =
      '<figure class="rte-image rte-image--size-100 rte-image--align-center img-align-center" data-type="image" data-size="100" data-align="center"><img src="https://x.com/c.png" alt=""><figcaption contenteditable="true"></figcaption></figure>';
    expect(roundTrip(html)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/imageFigure.test.ts`
Expected: FAIL — `imageFigure.ts` does not exist yet (`Cannot find module './imageFigure'`).

- [ ] **Step 3: Implement the extension**

```typescript
// client/src/components/RichTextEditor/extensions/imageFigure.ts
import { Node, mergeAttributes } from '@tiptap/core';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

type Size = (typeof allowedSizes)[number];
type Align = (typeof allowedAligns)[number];

const isValidSize = (value?: string | null): value is Size => allowedSizes.includes((value ?? '') as Size);
const isValidAlign = (value?: string | null): value is Align => allowedAligns.includes((value ?? '') as Align);

function readSize(figure: HTMLElement): Size {
  const dataSize = figure.getAttribute('data-size');
  if (isValidSize(dataSize)) return dataSize;
  const fromClass = Array.from(figure.classList)
    .find((cls) => cls.startsWith('rte-image--size-'))
    ?.replace('rte-image--size-', '');
  if (isValidSize(fromClass)) return fromClass;
  return '100';
}

function readAlign(figure: HTMLElement): Align {
  const dataAlign = figure.getAttribute('data-align');
  if (isValidAlign(dataAlign)) return dataAlign;
  const fromClass =
    Array.from(figure.classList).find((cls) => cls.startsWith('rte-image--align-'))?.replace('rte-image--align-', '') ??
    Array.from(figure.classList).find((cls) => cls.startsWith('img-align-'))?.replace('img-align-', '');
  if (isValidAlign(fromClass)) return fromClass;
  return 'center';
}

export type ImageFigureAttrs = {
  src: string;
  alt: string;
  size: Size;
  align: Align;
  status: 'idle' | 'uploading' | 'error';
};

export const ImageFigure = Node.create({
  name: 'imageFigure',
  group: 'block',
  content: 'inline*',
  isolating: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      size: { default: '100' },
      align: { default: 'center' },
      status: { default: 'idle', rendered: false }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const img = element.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? '',
            size: readSize(element),
            align: readAlign(element),
            status: 'idle'
          };
        }
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, size, align, status } = node.attrs as ImageFigureAttrs;
    const figureClass = [
      'rte-image',
      `rte-image--size-${size}`,
      `rte-image--align-${align}`,
      `img-align-${align}`,
      status === 'uploading' ? 'is-uploading' : '',
      status === 'error' ? 'has-error' : ''
    ]
      .filter(Boolean)
      .join(' ');

    const children: unknown[] = [
      ['img', { src, alt }],
      ['figcaption', { contenteditable: 'true' }, 0]
    ];
    if (status === 'uploading') {
      children.push(['div', { class: 'rte-image-overlay' }, 'Enviando...']);
    } else if (status === 'error') {
      children.push(['div', { class: 'rte-image-overlay error' }, 'Falha no upload']);
    }

    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        class: figureClass,
        'data-type': 'image',
        'data-size': size,
        'data-align': align
      }),
      ...children
    ];
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/imageFigure.test.ts`
Expected: PASS (3 tests). If the rendered attribute order differs from the expected string (HTML attribute order isn't guaranteed across DOM implementations), adjust the test's expected strings to match actual output rather than the implementation — attribute order doesn't matter functionally, only presence/values do.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/RichTextEditor/extensions/imageFigure.ts client/src/components/RichTextEditor/extensions/imageFigure.test.ts
git commit -m "feat(rte): extensão Tiptap imageFigure com round-trip compatível com o HTML legado"
```

---

## Task 3: `authorAttribution` extension (TDD)

**Files:**
- Create: `client/src/components/RichTextEditor/extensions/authorAttribution.ts`
- Create: `client/src/components/RichTextEditor/extensions/authorAttribution.test.ts`

- [ ] **Step 1: Write the failing round-trip tests**

```typescript
// client/src/components/RichTextEditor/extensions/authorAttribution.test.ts
import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Text from '@tiptap/extension-text';
import { AuthorAttribution } from './authorAttribution';

const extensions = [Document, Paragraph, Heading, Text, AuthorAttribution];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('AuthorAttribution round-trip', () => {
  it('preserves the heading variant (span.rte-author)', () => {
    const html = '<h2>Uma frase<span class="rte-author" data-type="quote-author">Carl Jung</span></h2>';
    expect(roundTrip(html)).toBe(html);
  });

  it('preserves the inline variant (strong.rte-author-inline)', () => {
    const html = '<p>Uma frase <strong class="rte-author-inline" data-type="quote-author-inline">Carl Jung</strong></p>';
    expect(roundTrip(html)).toBe(html);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/authorAttribution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the extension**

```typescript
// client/src/components/RichTextEditor/extensions/authorAttribution.ts
import { Node, mergeAttributes } from '@tiptap/core';

export type AuthorVariant = 'heading' | 'inline';

export const AuthorAttribution = Node.create({
  name: 'authorAttribution',
  group: 'inline',
  inline: true,
  content: 'text*',

  addAttributes() {
    return {
      variant: { default: 'inline' as AuthorVariant }
    };
  },

  parseHTML() {
    return [
      { tag: 'span.rte-author[data-type="quote-author"]', attrs: { variant: 'heading' } },
      { tag: 'strong.rte-author-inline[data-type="quote-author-inline"]', attrs: { variant: 'inline' } }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = node.attrs.variant as AuthorVariant;
    const tag = variant === 'heading' ? 'span' : 'strong';
    const className = variant === 'heading' ? 'rte-author' : 'rte-author-inline';
    const dataType = variant === 'heading' ? 'quote-author' : 'quote-author-inline';
    return [tag, mergeAttributes(HTMLAttributes, { class: className, 'data-type': dataType }), 0];
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/authorAttribution.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/RichTextEditor/extensions/authorAttribution.ts client/src/components/RichTextEditor/extensions/authorAttribution.test.ts
git commit -m "feat(rte): extensão Tiptap authorAttribution (variantes heading/inline) compatível com o HTML legado"
```

---

## Task 4: `textAlign` extension (TDD)

**Files:**
- Create: `client/src/components/RichTextEditor/extensions/textAlign.ts`
- Create: `client/src/components/RichTextEditor/extensions/textAlign.test.ts`

- [ ] **Step 1: Write the failing round-trip tests**

```typescript
// client/src/components/RichTextEditor/extensions/textAlign.test.ts
import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import Text from '@tiptap/extension-text';
import { TextAlign } from './textAlign';

const extensions = [Document, Paragraph, Heading, Blockquote, Text, TextAlign];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('TextAlign round-trip', () => {
  it('preserves a paragraph already using the class+data-align format', () => {
    const html = '<p class="align-center" data-align="center">Centralizado</p>';
    expect(roundTrip(html)).toBe(html);
  });

  it('normalizes a legacy inline style="text-align" into the class+data-align format', () => {
    const html = '<p style="text-align: right">Direita</p>';
    const expected = '<p class="align-right" data-align="right">Direita</p>';
    expect(roundTrip(html)).toBe(expected);
  });

  it('applies to headings and blockquotes too', () => {
    const html = '<h2 class="align-justify" data-align="justify">Titulo</h2><blockquote class="align-left" data-align="left">Citacao</blockquote>';
    expect(roundTrip(html)).toBe(html);
  });

  it('leaves unaligned blocks without the attribute', () => {
    const html = '<p>Sem alinhamento</p>';
    expect(roundTrip(html)).toBe(html);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/textAlign.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the extension**

```typescript
// client/src/components/RichTextEditor/extensions/textAlign.ts
import { Extension } from '@tiptap/core';

const allowedAligns = ['left', 'center', 'right', 'justify'] as const;
type Align = (typeof allowedAligns)[number];

const isValidAlign = (value?: string | null): value is Align => allowedAligns.includes((value ?? '') as Align);

function readAlign(element: HTMLElement): Align | null {
  const fromClass = allowedAligns.find((a) => element.classList.contains(`align-${a}`));
  if (fromClass) return fromClass;
  const dataAlign = element.getAttribute('data-align');
  if (isValidAlign(dataAlign)) return dataAlign;
  const style = (element.style.textAlign || '').toLowerCase();
  if (style === 'start') return 'left';
  if (style === 'end') return 'right';
  if (isValidAlign(style)) return style;
  return null;
}

export type TextAlignOptions = {
  types: string[];
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: Align) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'listItem']
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          align: {
            default: null,
            parseHTML: (element) => readAlign(element),
            renderHTML: (attrs) => {
              const align = attrs.align as Align | null;
              if (!align) return {};
              return { class: `align-${align}`, 'data-align': align };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: Align) =>
        ({ commands }) =>
          this.options.types.every((type) => commands.updateAttributes(type, { align: alignment })),
      unsetTextAlign:
        () =>
        ({ commands }) =>
          this.options.types.every((type) => commands.resetAttributes(type, 'align'))
    };
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/components/RichTextEditor/extensions/textAlign.test.ts`
Expected: PASS (4 tests). If the "leaves unaligned blocks without the attribute" test fails because `renderHTML` returning `{}` still adds an empty class, double check `attrs.align` is actually `null` for that input (it should be, since `readAlign` returns `null` when no class/data-align/style is present).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/RichTextEditor/extensions/textAlign.ts client/src/components/RichTextEditor/extensions/textAlign.test.ts
git commit -m "feat(rte): extensão Tiptap textAlign com classes align-* em vez de style inline"
```

---

## Task 5: Rewrite `useImageManager.ts` around Tiptap

**Files:**
- Modify: `client/src/components/RichTextEditor/hooks/useImageManager.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `client/src/components/RichTextEditor/hooks/useImageManager.ts` with:

```typescript
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { fetchMedia, uploadMedia } from '@/api/queries';
import type { Media } from '@/types';
import { positionFloating } from '@/utils/positionFloating';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

const isValidSize = (size?: string | null): size is (typeof allowedSizes)[number] =>
  allowedSizes.includes((size ?? '') as (typeof allowedSizes)[number]);

const isValidAlign = (align?: string | null): align is (typeof allowedAligns)[number] =>
  allowedAligns.includes((align ?? '') as (typeof allowedAligns)[number]);

function findImageFigurePos(editor: Editor, dom: HTMLElement): number | null {
  let pos: number | null = null;
  editor.state.doc.descendants((node, nodePos) => {
    if (pos !== null) return false;
    if (node.type.name !== 'imageFigure') return true;
    if (editor.view.nodeDOM(nodePos) === dom) {
      pos = nodePos;
      return false;
    }
    return true;
  });
  return pos;
}

type UseImageManagerArgs = {
  editor: Editor | null;
};

export function useImageManager({ editor }: UseImageManagerArgs) {
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

  const insertImage = (src: string, alt?: string, status: 'idle' | 'uploading' | 'error' = 'idle') => {
    if (!editor) return null;
    let insertedPos: number | null = null;
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        insertedPos = tr.selection.from;
        const node = state.schema.nodes.imageFigure.create(
          { src, alt: alt ?? '', size: '100', align: 'center', status },
          alt ? state.schema.text(alt) : undefined
        );
        tr.replaceSelectionWith(node);
        return true;
      })
      .run();
    return insertedPos;
  };

  const handleSelectFromLibrary = (item: Media) => {
    insertImage(item.url, item.alt ?? item.id);
    setShowImageModal(false);
  };

  const handleUploadNow = async (file: File, alt?: string) => {
    if (!editor) return;
    const objectUrl = URL.createObjectURL(file);
    const insertedPos = insertImage(objectUrl, alt, 'uploading');
    setShowImageModal(false);
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia({ file, alt });
      if (insertedPos !== null) {
        const node = editor.state.doc.nodeAt(insertedPos);
        if (node && node.type.name === 'imageFigure') {
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(insertedPos, undefined, {
                ...node.attrs,
                src: uploaded.url,
                alt: uploaded.alt ?? alt ?? '',
                status: 'idle'
              });
              return true;
            })
            .run();
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
      if (insertedPos !== null) {
        const node = editor.state.doc.nodeAt(insertedPos);
        if (node && node.type.name === 'imageFigure') {
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(insertedPos, undefined, { ...node.attrs, status: 'error' });
              return true;
            })
            .run();
        }
      }
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const highlightFigure = (figure: HTMLElement | null) => {
    const figures = editor?.view.dom.querySelectorAll('figure[data-type="image"]') ?? [];
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
    if (!editor || !activeFigure) return;
    const pos = findImageFigurePos(editor, activeFigure);
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    const size = isValidSize(editImageModal.size) ? editImageModal.size : '100';
    const align = isValidAlign(editImageModal.align) ? editImageModal.align : 'center';
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt: editImageModal.alt, size, align });
        return true;
      })
      .run();
    setImageMeta((prev) => (prev ? { ...prev, alt: editImageModal.alt, size, align } : prev));
    setEditImageModal((prev) => ({ ...prev, open: false }));
  };

  const requestRemoveImage = () => {
    if (!activeFigure) return;
    setImagePopover({ open: false, rect: null, target: null });
    setConfirmRemoveImage(true);
  };

  const executeRemoveImage = () => {
    if (!editor || !activeFigure) return;
    const pos = findImageFigurePos(editor, activeFigure);
    if (pos !== null) {
      const node = editor.state.doc.nodeAt(pos);
      if (node) {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      }
    }
    highlightFigure(null);
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
```

Note: the exported object has **exactly the same keys** as the previous `document.execCommand`-based version — `RteImageModal.tsx`, `RteImagePopover.tsx`, `RteImageEditModal.tsx`, `RteLightbox.tsx` need no changes.

- [ ] **Step 2: Commit (this won't compile cleanly until Task 7 wires `editor` in `index.tsx` — that's expected, move on)**

```bash
git add client/src/components/RichTextEditor/hooks/useImageManager.ts
git commit -m "refactor(rte): useImageManager passa a operar via comandos do Tiptap"
```

---

## Task 6: Rewrite `useLinkManager.ts` around Tiptap

**Files:**
- Modify: `client/src/components/RichTextEditor/hooks/useLinkManager.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import { positionFloating } from '@/utils/positionFloating';

type UseLinkManagerArgs = {
  editor: Editor | null;
};

export function useLinkManager({ editor }: UseLinkManagerArgs) {
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

  const getLinkRangeAtSelection = (): { from: number; to: number } | null => {
    if (!editor) return null;
    const { $from } = editor.state.selection;
    return getMarkRange($from, editor.schema.marks.link) ?? null;
  };

  const openLinkModal = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const selected = empty ? '' : editor.state.doc.textBetween(from, to);
    const range = getLinkRangeAtSelection();
    const href = range
      ? (editor.state.doc.nodeAt(range.from)?.marks.find((m) => m.type.name === 'link')?.attrs.href ?? '')
      : '';
    const anchorText = range ? editor.state.doc.textBetween(range.from, range.to) : '';
    setLinkUrl(href);
    setLinkText(selected || anchorText);
    setSelectedText(selected);
    setHasExistingLink(!!range);
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

  const applyLink = () => {
    if (!editor) return;
    const normalized = normalizeUrl(linkUrl);
    if (!normalized) {
      setLinkError('Informe uma URL.');
      return;
    }
    const { from, to, empty } = editor.state.selection;
    const hasSelection = !empty;
    const textForInsert = hasSelection ? editor.state.doc.textBetween(from, to) : linkText.trim();
    const existingRange = getLinkRangeAtSelection();

    if (existingRange) {
      const currentText = editor.state.doc.textBetween(existingRange.from, existingRange.to);
      if (textForInsert && textForInsert !== currentText) {
        editor
          .chain()
          .focus()
          .insertContentAt(existingRange, {
            type: 'text',
            text: textForInsert,
            marks: [{ type: 'link', attrs: { href: normalized } }]
          })
          .run();
      } else {
        editor.chain().focus().setTextSelection(existingRange).extendMarkRange('link').setLink({ href: normalized }).run();
      }
    } else if (hasSelection) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    } else {
      if (!textForInsert) {
        setLinkError('Selecione um texto ou informe o texto do link.');
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: textForInsert, marks: [{ type: 'link', attrs: { href: normalized } }] })
        .run();
    }

    setShowLinkModal(false);
    setLinkError(null);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const removeLink = () => {
    if (!editor) return;
    const range = getLinkRangeAtSelection();
    if (range) {
      editor.chain().focus().setTextSelection(range).unsetLink().run();
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

  const openFromAnchorClick = (anchor: HTMLAnchorElement) => {
    if (!editor) return;
    clickedLinkRef.current = anchor;
    const pos = editor.view.posAtDOM(anchor, 0);
    const $pos = editor.state.doc.resolve(pos);
    const range = getMarkRange($pos, editor.schema.marks.link);
    if (range) {
      editor.commands.setTextSelection(range);
    }
    setLinkUrl(anchor.getAttribute('href') ?? '');
    setLinkText(anchor.textContent ?? '');
    setSelectedText(anchor.textContent ?? '');
    setHasExistingLink(true);
    setLinkPopover({ open: true, href: anchor.getAttribute('href') ?? '', rect: anchor.getBoundingClientRect() });
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
```

Same note as Task 5: exported shape unchanged, `RteLinkModal.tsx`/`RteLinkPopover.tsx` need no changes.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/RichTextEditor/hooks/useLinkManager.ts
git commit -m "refactor(rte): useLinkManager passa a operar via comandos do Tiptap (getMarkRange/setLink)"
```

---

## Task 7: Rewrite `index.tsx`

**Files:**
- Modify: `client/src/components/RichTextEditor/index.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from 'react';
import type React from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import { TextAlign } from './extensions/textAlign';
import { ImageFigure } from './extensions/imageFigure';
import { AuthorAttribution } from './extensions/authorAttribution';
import { useLinkManager } from './hooks/useLinkManager';
import { useImageManager } from './hooks/useImageManager';
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

export function RichTextEditor({ value, onChange, onUploadingChange }: Props) {
  const [authorModal, setAuthorModal] = useState<{ open: boolean; value: string }>({ open: false, value: '' });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
        },
        codeBlock: false,
        code: false,
        strike: false,
        underline: false,
        horizontalRule: false
      }),
      TextAlign,
      ImageFigure,
      AuthorAttribution
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'rte-editor' }
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML())
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const linkManager = useLinkManager({ editor });
  const imageManager = useImageManager({ editor });

  useEffect(() => {
    onUploadingChange?.(imageManager.uploading);
  }, [imageManager.uploading, onUploadingChange]);

  const blockAlign =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => {
        if (!ed) return 'left' as const;
        if (ed.isActive({ align: 'center' })) return 'center' as const;
        if (ed.isActive({ align: 'right' })) return 'right' as const;
        if (ed.isActive({ align: 'justify' })) return 'justify' as const;
        return 'left' as const;
      }
    }) ?? 'left';

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

  const requestInsertQuoteAuthor = () => {
    setAuthorModal({ open: true, value: '' });
  };

  const applyQuoteAuthor = () => {
    if (!editor) return;
    const author = authorModal.value.trim();
    if (!author) return;

    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { $from } = state.selection;
        let target: { node: ReturnType<typeof $from.node>; pos: number; depth: number } | null = null;
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth);
          if (['heading', 'paragraph', 'blockquote', 'listItem'].includes(node.type.name)) {
            target = { node, pos: $from.before(depth), depth };
            break;
          }
        }
        if (!target) return false;

        const variant: 'heading' | 'inline' = target.node.type.name === 'heading' ? 'heading' : 'inline';
        const authorNode = state.schema.nodes.authorAttribution.create({ variant }, state.schema.text(author));
        const endPos = $from.end(target.depth);

        if (variant === 'heading') {
          let existingFrom: number | null = null;
          let existingTo: number | null = null;
          target.node.forEach((child, offset) => {
            if (existingFrom === null && child.type.name === 'authorAttribution' && child.attrs.variant === 'heading') {
              existingFrom = target!.pos + 1 + offset;
              existingTo = existingFrom + child.nodeSize;
            }
          });
          if (existingFrom !== null && existingTo !== null) {
            tr.replaceWith(existingFrom, existingTo, authorNode);
            return true;
          }
          tr.insert(endPos, authorNode);
          return true;
        }

        const needsSpace = target.node.textContent.length > 0 && !/\s$/.test(target.node.textContent);
        if (needsSpace) tr.insertText(' ', endPos);
        tr.insert(needsSpace ? endPos + 1 : endPos, authorNode);
        return true;
      })
      .run();

    setAuthorModal({ open: false, value: '' });
  };

  const toolbarGroups: {
    key: string;
    label: React.ReactNode;
    title: string;
    action: () => void;
  }[][] = [
    [
      { key: 'bold', label: <FontAwesomeIcon icon={faBold} />, title: 'Negrito', action: () => editor?.chain().focus().toggleBold().run() },
      { key: 'italic', label: <FontAwesomeIcon icon={faItalic} />, title: 'Itálico', action: () => editor?.chain().focus().toggleItalic().run() }
    ],
    [
      { key: 'p', label: <span className="rte-heading-icon">P</span>, title: 'Parágrafo / Texto normal', action: () => editor?.chain().focus().setParagraph().run() },
      {
        key: 'h2',
        label: (
          <span className="rte-heading-icon">
            <FontAwesomeIcon icon={faHeading} />
            <small>2</small>
          </span>
        ),
        title: 'Título 2',
        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
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
        action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run()
      }
    ],
    [
      { key: 'ul', label: <FontAwesomeIcon icon={faListUl} />, title: 'Lista', action: () => editor?.chain().focus().toggleBulletList().run() },
      { key: 'ol', label: <FontAwesomeIcon icon={faListOl} />, title: 'Lista numerada', action: () => editor?.chain().focus().toggleOrderedList().run() }
    ],
    [{ key: 'quote', label: <FontAwesomeIcon icon={faQuoteLeft} />, title: 'Citação', action: () => editor?.chain().focus().toggleBlockquote().run() }],
    [
      { key: 'align-left', label: <FontAwesomeIcon icon={faAlignLeft} />, title: 'Alinhar à esquerda', action: () => editor?.chain().focus().setTextAlign('left').run() },
      { key: 'align-center', label: <FontAwesomeIcon icon={faAlignCenter} />, title: 'Centralizar', action: () => editor?.chain().focus().setTextAlign('center').run() },
      { key: 'align-right', label: <FontAwesomeIcon icon={faAlignRight} />, title: 'Alinhar à direita', action: () => editor?.chain().focus().setTextAlign('right').run() },
      { key: 'align-justify', label: <FontAwesomeIcon icon={faAlignJustify} />, title: 'Justificar', action: () => editor?.chain().focus().setTextAlign('justify').run() }
    ],
    [{ key: 'link', label: <FontAwesomeIcon icon={faLink} />, title: 'Inserir link', action: linkManager.openLinkModal }],
    [{ key: 'author', label: <span className="rte-heading-icon">Au</span>, title: 'Inserir autor da frase', action: requestInsertQuoteAuthor }],
    [{ key: 'image', label: <FontAwesomeIcon icon={faImage} />, title: 'Inserir imagem', action: imageManager.openImageModal }]
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
                className={`rte-btn ${item.key === `align-${blockAlign}` ? 'is-active' : ''}`}
                aria-label={item.title}
                title={item.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={item.action}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div onClick={handleEditorClick}>
        <EditorContent editor={editor} />
      </div>

      <RteImagePopover imageManager={imageManager} />
      <RteLinkPopover linkManager={linkManager} />
      <RteImageModal imageManager={imageManager} captureSelection={() => {}} />
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
            <button className="btn btn-ghost" type="button" onClick={() => setAuthorModal({ open: false, value: '' })}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="button" onClick={applyQuoteAuthor} disabled={!authorModal.value.trim()}>
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
```

Note: `RteImageModal`'s `captureSelection` prop is passed as a no-op (`() => {}`) — Tiptap keeps its own selection state across modal open/close, so the old "capture native Range before losing focus" trick is no longer needed, but the prop is kept so `RteImageModal.tsx` itself doesn't need editing.

- [ ] **Step 2: Delete the now-unused `utils/positionFloating.ts` re-export from the old hooks if any lingered (sanity check, likely a no-op)**

Run: `cd client && grep -rn "normalizeImageBlocks\|enforceLinksTarget" src/components/RichTextEditor/`
Expected: no matches outside of git history — both were only used by the old `index.tsx`/hooks, which are now fully replaced.

- [ ] **Step 3: Typecheck**

Run: `cd client && npx tsc -b --noEmit`
Expected: no errors in `RichTextEditor/`. If you see a type error on `editor.commands.setContent(value, { emitUpdate: false })`, `editor.chain().insertContentAt(...)`, or `getMarkRange` not being exported from `@tiptap/core`, open `node_modules/@tiptap/core/dist/index.d.ts` (or the relevant sub-path) to check the exact signature/export name for the installed `3.26.1` and adjust the call — the APIs above are written from the documented v3 behavior but exact overload shapes can shift between minor versions.

- [ ] **Step 4: Run the extension test suite once more (regression check)**

Run: `cd client && npx vitest run`
Expected: all tests from Tasks 2-4 still pass (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/RichTextEditor/index.tsx
git commit -m "refactor(rte): index.tsx usa EditorContent/useEditor do Tiptap em vez de contentEditable manual"
```

---

## Task 8: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start both servers**

Terminal 1: `cd server && npm run dev`
Terminal 2: `cd client && npm run dev`

- [ ] **Step 2: Open an existing article that has rich content**

Log into `/admin/login`, go to `/admin/articles`, open an existing article in edit mode (if none has images/authors/alignment yet, create one through the editor first in Step 3, save it, then reopen it fresh to confirm the round trip through a real save+reload).

- [ ] **Step 3: Exercise every toolbar action and confirm visually**

In a test article, check off each as it works correctly:
- [ ] Bold / Italic toggle on selected text
- [ ] Paragraph / H2 / H3 block type switch
- [ ] Bullet list / numbered list
- [ ] Blockquote
- [ ] Align left / center / right / justify — toolbar button highlights the active alignment as the cursor moves between blocks
- [ ] Insert link via toolbar (no selection — should prompt for URL + text), and with a text selection (should wrap the selection)
- [ ] Click an existing link — popover appears with "open/edit/remove" buttons, positioned near the link
- [ ] Edit a link's URL only (text unchanged) and URL+text together via the modal
- [ ] Remove a link from the popover
- [ ] Insert an image from the library and via direct upload (check the alt-text field works, no `window.prompt` appears)
- [ ] Click an inserted image — popover appears with view/edit/remove buttons
- [ ] Edit an image's alt/size/align via the modal, confirm the figure updates visually
- [ ] Open the lightbox from the image popover
- [ ] Remove an image (with confirm dialog)
- [ ] Insert an author attribution while the cursor is in a heading, then again in a paragraph — confirm the heading variant replaces a prior one instead of duplicating, and the paragraph variant appends after existing text

- [ ] **Step 4: Save the article and reload the page to confirm persistence**

Click "Salvar rascunho", refresh the browser, reopen the same article — confirm every element from Step 3 still renders identically (this proves `editor.getHTML()` → save → `setContent()` on reload round-trips correctly).

- [ ] **Step 5: Confirm the public site still renders the saved content unchanged**

If the test article was published (or use "Visualizar site" preview), open `/blog/<slug>` and visually compare the image/author/alignment rendering against what was visible in the editor — the public renderer (`ArticlePage.tsx`) uses `dangerouslySetInnerHTML` directly on the same HTML string, so no extra work is needed here, only visual confirmation.

- [ ] **Step 6: Regression-check the other 3 consumers of `RichTextEditor`**

Open the editor for one block of each remaining type that embeds `RichTextEditor` (`text`, `media-text`, `contact-info` blocks, via the page editor's block editor modal) and confirm the toolbar renders and a simple edit (typing + bold) works in each.

---

## Task 9: Final verification and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full client verification**

Run: `cd client && npx tsc -b --noEmit && npx vitest run`
Expected: typecheck clean, all extension tests passing.

- [ ] **Step 2: Production build sanity check**

Run: `cd client && npm run build`
Expected: build succeeds (this also catches any tree-shaking/import issues that `tsc --noEmit` alone wouldn't).

- [ ] **Step 3: Update `CLAUDE.md`**

In `CLAUDE.md`, replace:

```
- **Fase 6** (em andamento): Segurança (auth via httpOnly cookie — concluído), migração do `RichTextEditor` de `execCommand` para Tiptap (pendente)
```

with:

```
- **Fase 6** (concluída): Segurança (auth via httpOnly cookie), migração do `RichTextEditor` de `execCommand` para Tiptap (`client/src/components/RichTextEditor/extensions/`)
```

Also update the stack line — find:

```
- **Frontend:** React 19 + Vite + TypeScript strict + React Query + Axios
```

and add Tiptap:

```
- **Frontend:** React 19 + Vite + TypeScript strict + React Query + Axios + Tiptap (editor de texto rico)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(CLAUDE.md): marcar Fase 6 (auth + Tiptap) como concluída"
```

---

## Self-Review Notes

- **Spec coverage:** HTML compatibility (Tasks 2-4 with round-trip tests), popovers kept (Tasks 5-7 reuse the exact hook shape so the 6 popover/modal components are untouched), vitest added (Task 1) — all confirmed against the approved design.
- **Type consistency:** `ImageFigureAttrs`/`AuthorVariant`/`TextAlignOptions` types are defined once per extension and only consumed via the editor's schema (no duplicated attr shape across files). The hook return shapes in Tasks 5-6 were checked field-by-field against the actual prop usage in `RteImageModal.tsx`, `RteImagePopover.tsx`, `RteImageEditModal.tsx`, `RteLightbox.tsx`, `RteLinkModal.tsx`, `RteLinkPopover.tsx` (all 6 files read in full before writing this plan) — no field was renamed.
- **Known risk accepted explicitly:** the exact Tiptap v3.26.1 API signatures for `setContent`'s options object and `insertContentAt` were written from documented v3 behavior, not verified by running code during planning. Task 7 Step 3 explicitly directs checking the installed type definitions if `tsc` flags a mismatch, rather than guessing further — this is the safety net for that uncertainty.
- **Out of scope (confirmed during brainstorming):** no DB migration, no changes to `PageRenderer.tsx`, `ArticlePage.tsx`, or any block `renderer.tsx`/`schema.ts`, no removal of the floating popovers, no new toolbar features beyond what exists today.
