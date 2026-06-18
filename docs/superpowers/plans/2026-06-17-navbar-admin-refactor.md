# Plano — Refatoração do Admin de Navegação

**Data:** 2026-06-17  
**Arquivo principal:** `client/src/pages/AdminNavbarPage.tsx`  
**Componentes envolvidos:** `NavigationTree`, `NavigationItemRow`, `FooterPreview`, `AdminUI`  
**Dependência nova:** `@dnd-kit/core` + `@dnd-kit/sortable` (instalar no `client/`)

---

## Visão geral

Substituir a tela atual de gerenciamento da navbar por uma interface mais compacta, com:
- Tree view hierárquica com indentação e colapso por item pai
- Drag-and-drop para reordenação (via `@dnd-kit/sortable`)
- Menu de três pontos para ações secundárias
- Drawer lateral direito no lugar do modal
- Chips/toggles inline para Navbar, Rodapé e Visível
- Previews de navbar e rodapé com aparência do site real
- Formulário com fieldsets agrupados
- Layout responsivo (compacto no desktop, cards no mobile)

---

## Passo 1 — Instalar dependência

```bash
cd client && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Nenhuma outra dependência externa é necessária.

---

## Passo 2 — Criar `NavDrawer` em `AdminUI.tsx`

Adicionar o componente `NavDrawer` ao final de `client/src/components/AdminUI.tsx`, sem alterar o `Modal` existente (outras telas o usam):

```tsx
// Adicionar ao AdminUI.tsx

type NavDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function NavDrawer({ isOpen, onClose, title, children, footer }: NavDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return ReactDOM.createPortal(
    <>
      {/* overlay */}
      <div
        className={`nav-drawer-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* painel */}
      <div
        className={`nav-drawer ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nav-drawer-header">
          <h2>{title}</h2>
          <button className="admin-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="nav-drawer-body">{children}</div>
        {footer && <div className="nav-drawer-footer">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
```

**CSS a adicionar (em `App.css` ou folha de estilos da navbar):**

```css
.nav-drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  opacity: 0; pointer-events: none; z-index: 400;
  transition: opacity 200ms;
}
.nav-drawer-overlay.is-open { opacity: 1; pointer-events: auto; }

.nav-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(480px, 100vw);
  background: var(--surface);
  box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  z-index: 401;
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 240ms cubic-bezier(.4,0,.2,1);
}
.nav-drawer.is-open { transform: translateX(0); }
.nav-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
}
.nav-drawer-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
.nav-drawer-footer {
  padding: 1rem 1.5rem; border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 0.5rem;
}
```

---

## Passo 3 — Reescrever `NavigationItemRow.tsx`

Substituir completamente o arquivo. Mudanças:
- Remover setas de reordenação do componente (o DnD cuida disso)
- Adicionar `dragHandleProps` via prop do `@dnd-kit/sortable`
- Mover editar/excluir para menu de três pontos (`ContextMenu` local)
- Chips de Navbar/Rodapé/Visível permanecem inline como botões toggle
- Remover o `<select>` de pai inline (vai para o drawer)
- Adicionar indicador visual de profundidade via `depth`

```tsx
// client/src/components/navigation/NavigationItemRow.tsx
import { useRef, useState } from 'react';
import type { NavbarItem } from '../../types';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

type NavigationItemRowProps = {
  item: NavbarItem;
  depth?: number;
  onToggleNavbar: () => void;
  onToggleFooter: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: Record<string, unknown>;
  isDragging?: boolean;
};

export function NavigationItemRow({
  item, depth = 0,
  onToggleNavbar, onToggleFooter, onToggleVisible,
  onEdit, onDelete,
  dragListeners, dragAttributes, isDragging,
}: NavigationItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolveHref = () => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  return (
    <div
      className={`nav-row ${depth > 0 ? 'is-child' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ '--nav-depth': depth } as React.CSSProperties}
    >
      {/* Drag handle */}
      <button
        className="nav-drag-handle"
        {...dragListeners}
        {...dragAttributes}
        type="button"
        aria-label="Arrastar para reordenar"
        tabIndex={0}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
          <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
          <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
        </svg>
      </button>

      {/* Indentação visual para filhos */}
      {depth > 0 && <span className="nav-indent-line" aria-hidden="true" />}

      <div className="nav-row-body">
        <div className="nav-row-title">
          <strong>{item.label}</strong>
          {!item.isVisible && <span className="nav-chip-soft muted">Oculto</span>}
        </div>
        <span className="muted small">{resolveHref()}</span>
        <div className="nav-chip-group">
          <button
            type="button"
            className={`nav-chip-toggle ${item.showInNavbar ? 'is-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleNavbar(); }}
          >Navbar</button>
          <button
            type="button"
            className={`nav-chip-toggle ${item.showInFooter ? 'is-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFooter(); }}
          >Rodapé</button>
          <button
            type="button"
            className={`nav-chip-toggle ${item.isVisible ? 'is-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          >Visível</button>
        </div>
      </div>

      {/* Menu de 3 pontos */}
      <div className="nav-context-menu-wrapper" ref={menuRef}>
        <button
          type="button"
          className="nav-three-dots"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Mais ações"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.8"/>
            <circle cx="12" cy="12" r="1.8"/>
            <circle cx="12" cy="19" r="1.8"/>
          </svg>
        </button>
        {menuOpen && (
          <div className="nav-context-menu" role="menu">
            <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onEdit(); }}>
              Editar
            </button>
            <button role="menuitem" type="button" className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**CSS a adicionar:**
```css
.nav-drag-handle {
  cursor: grab; padding: 0.25rem; color: var(--text-muted);
  background: none; border: none; display: flex; align-items: center;
  flex-shrink: 0; touch-action: none;
}
.nav-drag-handle:active { cursor: grabbing; }

.nav-indent-line {
  display: block; width: 2px; height: 100%;
  background: var(--border); margin: 0 0.5rem 0 0.25rem;
  border-radius: 1px; align-self: stretch; flex-shrink: 0;
}

.nav-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: background 120ms;
  padding-left: calc(0.75rem + var(--nav-depth, 0) * 1.5rem);
}
.nav-row:hover { background: var(--surface-hover, rgba(0,0,0,0.03)); }
.nav-row.is-dragging { opacity: 0.5; background: var(--surface-hover); }

.nav-three-dots {
  background: none; border: none; cursor: pointer; padding: 0.25rem;
  border-radius: 4px; color: var(--text-muted); flex-shrink: 0;
}
.nav-three-dots:hover { background: var(--surface-hover); color: var(--text); }

.nav-context-menu-wrapper { position: relative; }
.nav-context-menu {
  position: absolute; right: 0; top: calc(100% + 4px);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 140px; z-index: 100; overflow: hidden;
}
.nav-context-menu button {
  display: block; width: 100%; text-align: left;
  padding: 0.5rem 1rem; background: none; border: none;
  cursor: pointer; font-size: 0.875rem; color: var(--text);
}
.nav-context-menu button:hover { background: var(--surface-hover); }
.nav-context-menu button.danger { color: var(--color-danger, #e53e3e); }
```

---

## Passo 4 — Reescrever `NavigationTree.tsx`

Substituir completamente o arquivo. Mudanças principais:
- Usar `@dnd-kit/sortable` para DnD
- Cada item pai tem um botão de colapso (chevron); submenus só aparecem quando expandidos
- Estado de expansão local por item (`expandedIds`)
- Quando item pai não tem filhos E está expandido, exibe estado vazio + botão "Adicionar submenu"

```tsx
// client/src/components/navigation/NavigationTree.tsx
import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NavbarItem } from '../../types';
import { NavigationItemRow } from './NavigationItemRow';

type NavigationTreeProps = {
  items: NavbarItem[];
  onToggleNavbar: (item: NavbarItem) => void;
  onToggleFooter: (item: NavbarItem) => void;
  onToggleVisible: (item: NavbarItem) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
  onReorder: (ordered: NavbarItem[]) => void;  // substitui onMoveUp/onMoveDown
  onAddChild: (parent: NavbarItem) => void;
};

function SortableItem({ id, children }: { id: string; children: (props: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
    >
      {children(sortable)}
    </div>
  );
}

export function NavigationTree({
  items,
  onToggleNavbar, onToggleFooter, onToggleVisible,
  onEdit, onDelete, onReorder, onAddChild,
}: NavigationTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const sortByOrder = (a: NavbarItem, b: NavbarItem) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);
  const roots = [...items].filter((i) => i.showInNavbar && i.parentId === null).sort(sortByOrder);
  const childrenMap = items.reduce<Record<string, NavbarItem[]>>((acc, item) => {
    if (item.parentId) {
      acc[item.parentId] ??= [];
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});
  Object.values(childrenMap).forEach((g) => g.sort(sortByOrder));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRootDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = roots.findIndex((i) => i.id === active.id);
    const newIndex = roots.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...roots];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
    const updated = items.map((item) => {
      const newOrder = reordered.findIndex((r) => r.id === item.id);
      return newOrder !== -1 ? { ...item, orderNavbar: newOrder } : item;
    });
    onReorder(updated);
  };

  // Cada pai tem seu próprio DndContext para filhos
  const handleChildDragEnd = (parentId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const children = childrenMap[parentId] ?? [];
    const oldIndex = children.findIndex((i) => i.id === active.id);
    const newIndex = children.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...children];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
    const updated = items.map((item) => {
      const newOrder = reordered.findIndex((c) => c.id === item.id);
      return newOrder !== -1 ? { ...item, orderNavbar: newOrder } : item;
    });
    onReorder(updated);
  };

  if (roots.length === 0) {
    return <div className="admin-empty">Nenhum item na navegação.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
      <SortableContext items={roots.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="nav-tree">
          {roots.map((item) => {
            const children = childrenMap[item.id] ?? [];
            const isExpanded = expandedIds.has(item.id);

            return (
              <SortableItem key={item.id} id={item.id}>
                {(sortable) => (
                  <div className="nav-tree-node">
                    <div className="nav-root-row">
                      {item.isParent && (
                        <button
                          type="button"
                          className={`nav-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                          onClick={() => toggleExpand(item.id)}
                          aria-label={isExpanded ? 'Recolher submenus' : 'Expandir submenus'}
                          aria-expanded={isExpanded}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      )}
                      {!item.isParent && <span className="nav-expand-spacer" />}
                      <NavigationItemRow
                        item={item}
                        depth={0}
                        onToggleNavbar={() => onToggleNavbar(item)}
                        onToggleFooter={() => onToggleFooter(item)}
                        onToggleVisible={() => onToggleVisible(item)}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item)}
                        dragListeners={sortable.listeners}
                        dragAttributes={sortable.attributes}
                        isDragging={sortable.isDragging}
                      />
                    </div>

                    {item.isParent && isExpanded && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleChildDragEnd(item.id, e)}
                      >
                        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                          <div className="nav-children-shell">
                            {children.length === 0 && (
                              <div className="admin-empty small">
                                Nenhum submenu.{' '}
                                <button type="button" className="btn-link" onClick={() => onAddChild(item)}>
                                  Adicionar
                                </button>
                              </div>
                            )}
                            {children.map((child) => (
                              <SortableItem key={child.id} id={child.id}>
                                {(childSortable) => (
                                  <NavigationItemRow
                                    item={child}
                                    depth={1}
                                    onToggleNavbar={() => onToggleNavbar(child)}
                                    onToggleFooter={() => onToggleFooter(child)}
                                    onToggleVisible={() => onToggleVisible(child)}
                                    onEdit={() => onEdit(child)}
                                    onDelete={() => onDelete(child)}
                                    dragListeners={childSortable.listeners}
                                    dragAttributes={childSortable.attributes}
                                    isDragging={childSortable.isDragging}
                                  />
                                )}
                              </SortableItem>
                            ))}
                            <button
                              type="button"
                              className="btn btn-ghost small nav-add-child-btn"
                              onClick={() => onAddChild(item)}
                            >
                              + Adicionar submenu
                            </button>
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

**CSS a adicionar:**
```css
.nav-tree { display: flex; flex-direction: column; gap: 2px; }
.nav-tree-node { display: flex; flex-direction: column; }

.nav-root-row {
  display: flex; align-items: center; gap: 0.25rem;
}
.nav-expand-btn {
  background: none; border: none; cursor: pointer;
  padding: 0.25rem; flex-shrink: 0; color: var(--text-muted);
  transform-origin: center; transition: transform 160ms;
  display: flex; align-items: center;
}
.nav-expand-btn.is-expanded { transform: rotate(90deg); }
.nav-expand-spacer { width: 24px; flex-shrink: 0; }

.nav-children-shell {
  margin-left: 1.75rem;
  border-left: 2px solid var(--border);
  padding-left: 0.5rem;
  margin-bottom: 0.25rem;
}
.nav-add-child-btn {
  margin-top: 0.25rem;
  margin-left: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.btn-link {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--color-primary); text-decoration: underline; font-size: inherit;
}
```

---

## Passo 5 — Criar `NavbarPreview.tsx`

Novo componente que renderiza a navbar admin com aparência visual parecida com o site real. Substitui a seção "Preview" atual.

**Arquivo:** `client/src/components/navigation/NavbarPreview.tsx`

```tsx
import type { NavbarItem } from '../../types';

type NavbarPreviewProps = {
  items: NavbarItem[];
  footerItems: NavbarItem[];
};

export function NavbarPreview({ items, footerItems }: NavbarPreviewProps) {
  const resolveHref = (item: NavbarItem) => {
    if (item.type === 'EXTERNAL_URL') return item.url ?? '#';
    const key = item.pageKey ?? '';
    if (!key || key === 'home') return '/';
    if (key === 'blog') return '/blog';
    if (key === 'sobre' || key === 'contato') return `/${key}`;
    return `/p/${key}`;
  };

  const roots = items
    .filter((i) => i.showInNavbar && i.isVisible && i.parentId === null)
    .sort((a, b) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0));

  const childrenOf = (id: string) =>
    items
      .filter((i) => i.parentId === id && i.isVisible)
      .sort((a, b) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0));

  return (
    <div className="nav-preview-section">
      {/* Preview da Navbar */}
      <p className="eyebrow">Preview — Navbar</p>
      <div className="nav-preview-bar" role="presentation">
        <span className="nav-preview-brand">Cris Jageneski</span>
        <nav className="nav-preview-links">
          {roots.map((item) => {
            const children = item.isParent ? childrenOf(item.id) : [];
            return (
              <div key={item.id} className="nav-preview-item">
                <span className="nav-preview-link">
                  {item.label}
                  {item.isParent && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </span>
                {children.length > 0 && (
                  <div className="nav-preview-dropdown">
                    {children.map((child) => (
                      <span key={child.id} className="nav-preview-dropdown-item">{child.label}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Preview do Rodapé */}
      <p className="eyebrow" style={{ marginTop: '1.5rem' }}>Preview — Rodapé</p>
      <div className="nav-preview-footer" role="presentation">
        {footerItems.length === 0 ? (
          <span className="muted small">Nenhum item no rodapé.</span>
        ) : (
          footerItems
            .filter((i) => i.isVisible)
            .sort((a, b) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0))
            .map((item) => (
              <a key={item.id} href={resolveHref(item)} className="nav-preview-footer-link" tabIndex={-1}>
                {item.label}
              </a>
            ))
        )}
      </div>
    </div>
  );
}
```

**CSS a adicionar:**
```css
.nav-preview-section { display: flex; flex-direction: column; }

.nav-preview-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 0.75rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.nav-preview-brand { font-weight: 700; font-size: 1rem; }
.nav-preview-links { display: flex; gap: 0.25rem; align-items: center; }

.nav-preview-item { position: relative; }
.nav-preview-item:hover .nav-preview-dropdown { display: flex; }

.nav-preview-link {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.875rem; padding: 0.3rem 0.6rem;
  border-radius: 6px; cursor: default;
  color: var(--text); user-select: none;
}
.nav-preview-link:hover { background: var(--surface-hover); }

.nav-preview-dropdown {
  display: none; flex-direction: column;
  position: absolute; top: 100%; left: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  min-width: 140px; z-index: 10; padding: 0.25rem;
}
.nav-preview-dropdown-item {
  font-size: 0.85rem; padding: 0.4rem 0.75rem;
  border-radius: 5px; color: var(--text); cursor: default;
}
.nav-preview-dropdown-item:hover { background: var(--surface-hover); }

.nav-preview-footer {
  display: flex; flex-wrap: wrap; gap: 0.75rem;
  background: var(--surface-muted, #f8f7f5);
  border: 1px solid var(--border); border-radius: 10px;
  padding: 0.75rem 1.25rem;
}
.nav-preview-footer-link {
  font-size: 0.875rem; color: var(--text-muted);
  text-decoration: none;
}
.nav-preview-footer-link:hover { color: var(--text); }
```

---

## Passo 6 — Reescrever o formulário no `AdminNavbarPage.tsx` com fieldsets

O formulário passa a ser filho do `NavDrawer`. Agrupar em 4 fieldsets:

### Fieldset 1 — Conteúdo
- `label` (texto do item)

### Fieldset 2 — Destino
- `type` (página interna / URL externa)
- `pageKey` ou `url` conforme tipo

### Fieldset 3 — Exibição
- Switch "Mostrar na navbar"
- Switch "Mostrar no rodapé"
- Switch "Visível"

### Fieldset 4 — Hierarquia
- Switch **"Permitir submenus"** (renomeado de "Item pai")
  - Texto auxiliar abaixo: "Este item pode conter submenus. Itens com submenus não podem ser filhos de outros itens."
  - Desabilitado se `parentId !== null`
- Select "Submenu de" (aparece se `!form.isParent && form.showInNavbar`)
  - Desabilitado com tooltip "Ative 'Mostrar na navbar' primeiro" se `!form.showInNavbar`

**CSS para fieldsets:**
```css
.nav-form-fieldset {
  border: none; padding: 0; margin: 0 0 1.25rem;
}
.nav-form-fieldset legend {
  font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); margin-bottom: 0.5rem;
}
.nav-form-fieldset + .nav-form-fieldset {
  border-top: 1px solid var(--border); padding-top: 1.25rem;
}
```

---

## Passo 7 — Adaptar `AdminNavbarPage.tsx`

### 7a. Substituir `Modal` por `NavDrawer`
- Importar `NavDrawer` de `AdminUI`
- Remover import de `Modal`
- Trocar `<Modal isOpen={showForm} ...>` por `<NavDrawer isOpen={showForm} ...>`

### 7b. Substituir lógica de `onMoveUp`/`onMoveDown` por `onReorder`
- Remover `moveNavbarItem` e `moveFooterItem`
- Adicionar `handleReorder(updatedItems: NavbarItem[])`:

```typescript
const handleReorder = async (updatedItems: NavbarItem[]) => {
  const previous = navItems;
  setNavItems(updatedItems);
  try {
    await reorderMutation.mutateAsync({ context: 'navbar', items: buildNavbarPayload(updatedItems) });
    showToastMessage('Ordem atualizada');
  } catch {
    setNavItems(previous);
    setError('Não foi possível salvar a nova ordem.');
  }
};
```

- Para o rodapé, o DnD no `FooterPreview` chama `onReorder` com contexto `'footer'`.

### 7c. Adicionar `NavbarPreview` no layout
- Remover `FooterPreview` do grid (a preview de rodapé agora fica dentro de `NavbarPreview`)
- Substituir o segundo card por `<NavbarPreview items={navItems} footerItems={footerItems} />`

### 7d. Atualizar a prop `onChangeParent`
- A prop `onChangeParent` sai do `NavigationTree` (era usada no select inline)
- Mover essa lógica para dentro do drawer, no fieldset de Hierarquia

### 7e. Remover `FooterPreview.tsx`
- O arquivo pode ser deletado após integração de `NavbarPreview`

### 7f. Props removidas do `NavigationTree`
Remover:
- `onMoveUp`, `onMoveDown`, `onChangeParent`

Adicionar:
- `onReorder: (items: NavbarItem[]) => void`

---

## Passo 8 — Layout responsivo

### Desktop (>= 768px)
- Grid de 2 colunas: `[árvore de navegação] [preview navbar+rodapé]`
- Árvore: 60% / Preview: 40%

### Mobile (< 768px)
- Coluna única; árvore primeiro, preview abaixo (colapsada por padrão num accordion)
- Rows da árvore viram cards com mais padding

```css
.nav-builder-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 768px) {
  .nav-builder-grid {
    grid-template-columns: 1fr;
  }
  .nav-row {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
  }
  .nav-chip-group { flex-wrap: wrap; }
}
```

---

## Passo 9 — Fechar menu de contexto ao clicar fora

No `NavigationItemRow`, adicionar um `useEffect` com listener de `mousedown` no `document` para fechar `menuOpen` quando o clique acontecer fora do `menuRef`.

```typescript
useEffect(() => {
  if (!menuOpen) return;
  const handler = (e: MouseEvent) => {
    if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [menuOpen]);
```

---

## Ordem de execução recomendada para o Haiku

1. `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` no `client/`
2. Adicionar `NavDrawer` ao `AdminUI.tsx` + CSS do drawer
3. Reescrever `NavigationItemRow.tsx` + CSS do row/menu
4. Criar `NavbarPreview.tsx` + CSS de preview
5. Reescrever `NavigationTree.tsx` (usa DnD, remove setas) + CSS da tree
6. Adaptar `AdminNavbarPage.tsx`: trocar modal→drawer, mover→reorder, substituir FooterPreview→NavbarPreview, atualizar formulário com fieldsets
7. Deletar `FooterPreview.tsx`
8. Testar:
   - DnD de itens raiz e subitens
   - Colapso/expansão dos pais
   - Chips inline funcionando (Navbar / Rodapé / Visível)
   - Drawer abre/fecha e salva corretamente
   - Preview reflete estado atual
   - Layout no mobile (< 768px)
   - Confirmação de exclusão continua funcionando

---

## Checklist de validação

- [ ] Nenhum `any` sem comentário justificando
- [ ] `NavigationItemRow` não importa `IconButton` com `arrow-up`/`arrow-down` (setas removidas)
- [ ] Menu de contexto fecha ao clicar fora
- [ ] Drawer fecha ao clicar no overlay
- [ ] DnD funciona para raiz e para submenus independentemente
- [ ] `ConfirmModal` para exclusão permanece intacto
- [ ] TypeScript strict: sem erros de tipo
- [ ] `console.log` removidos
- [ ] `FooterPreview.tsx` deletado e sem referências órfãs
