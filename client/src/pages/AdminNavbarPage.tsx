import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { SeoHead } from '../components/SeoHead';
import { ConfirmModal, Modal, Switch } from '../components/AdminUI';
import {
  createNavbarItem,
  deleteNavbarItem,
  fetchAdminNavbar,
  fetchAdminPages,
  reorderNavbarItems,
  updateNavbarItem
} from '../api/queries';
import type { NavbarItem, Page } from '../types';
import { NavigationTree } from '../components/navigation/NavigationTree';
import { FooterPreview } from '../components/navigation/FooterPreview';

type NavigationForm = {
  label: string;
  type: 'INTERNAL_PAGE' | 'EXTERNAL_URL';
  pageKey: string;
  url: string;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId: string | null;
  isVisible: boolean;
};

const defaultForm: NavigationForm = {
  label: '',
  type: 'INTERNAL_PAGE',
  pageKey: '',
  url: '',
  isParent: false,
  showInNavbar: true,
  showInFooter: false,
  parentId: null,
  isVisible: true
};

const sortNavbar = (a: NavbarItem, b: NavbarItem) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);
const sortFooter = (a: NavbarItem, b: NavbarItem) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0);

const builtInPages: { slug: string; label: string }[] = [
  { slug: 'home', label: 'Home (/)' },
  { slug: 'sobre', label: 'Sobre (/sobre)' },
  { slug: 'contato', label: 'Contato (/contato)' },
  { slug: 'blog', label: 'Blog (/blog)' }
];

export function NavigationBuilderPage() {
  const qc = useQueryClient();
  const { data: items } = useQuery<NavbarItem[]>({ queryKey: ['admin', 'navbar'], queryFn: fetchAdminNavbar });
  const { data: pages } = useQuery<Page[]>({ queryKey: ['admin', 'pages', 'select'], queryFn: fetchAdminPages });
  const [navItems, setNavItems] = useState<NavbarItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NavbarItem | null>(null);
  const [form, setForm] = useState<NavigationForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<NavbarItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (items) setNavItems(items);
  }, [items]);

  const navbarItems = useMemo(() => [...navItems].sort(sortNavbar), [navItems]);
  const footerItems = useMemo(
    () => navItems.filter((i) => i.showInFooter).sort(sortFooter),
    [navItems]
  );

  const refreshNav = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'navbar'] });
    qc.invalidateQueries({ queryKey: ['navbar'] });
  };

  const showToastMessage = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  };

  const createMutation = useMutation({
    mutationFn: createNavbarItem,
    onSuccess: () => {
      refreshNav();
      setForm(defaultForm);
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<NavbarItem> }) => updateNavbarItem(id, payload),
    onSuccess: () => {
      refreshNav();
      setShowForm(false);
      setEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNavbarItem,
    onSuccess: () => {
      refreshNav();
      setDeleteTarget(null);
    }
  });

  const normalizeNavbarOrders = (list: NavbarItem[]) => {
    const next = list.map((i) => ({ ...i }));
    const parents = Array.from(new Set(next.filter((i) => i.showInNavbar).map((i) => i.parentId ?? null)));
    parents.forEach((parentId) => {
      const group = next
        .filter((i) => i.showInNavbar && (i.parentId ?? null) === parentId)
        .sort(sortNavbar);
      group.forEach((item, index) => {
        const ref = next.find((i) => i.id === item.id);
        if (ref) ref.orderNavbar = index;
      });
    });
    return next;
  };

  const normalizeFooterOrders = (list: NavbarItem[]) => {
    const next = list.map((i) => ({ ...i }));
    const group = next.filter((i) => i.showInFooter).sort(sortFooter);
    group.forEach((item, index) => {
      const ref = next.find((i) => i.id === item.id);
      if (ref) ref.orderFooter = index;
    });
    return next;
  };

  const moveNavbarItem = async (item: NavbarItem, direction: 'up' | 'down') => {
    const previous = navItems;
    const working = normalizeNavbarOrders(navItems);
    const target = working.find((i) => i.id === item.id && i.showInNavbar);
    if (!target) return;
    const parentId = target.parentId ?? null;
    const group = working.filter((i) => i.showInNavbar && (i.parentId ?? null) === parentId).sort(sortNavbar);
    const index = group.findIndex((i) => i.id === item.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= group.length) return;
    const swapId = group[swapIndex].id;

    const swapped = working.map((i) => {
      if (i.id === item.id) return { ...i, orderNavbar: swapIndex };
      if (i.id === swapId) return { ...i, orderNavbar: index };
      return i;
    });
    const normalized = normalizeNavbarOrders(swapped);
    setNavItems(normalized);
    try {
      await reorderNavbarItems('navbar', buildNavbarPayload(normalized));
      showToastMessage('Ordem atualizada');
      refreshNav();
    } catch {
      setNavItems(previous);
      setError('Não foi possível salvar a nova ordem da navbar.');
    }
  };

  const moveFooterItem = async (item: NavbarItem, direction: 'up' | 'down') => {
    const previous = navItems;
    const working = normalizeFooterOrders(navItems);
    const target = working.find((i) => i.id === item.id && i.showInFooter);
    if (!target) return;
    const group = working.filter((i) => i.showInFooter).sort(sortFooter);
    const index = group.findIndex((i) => i.id === item.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= group.length) return;
    const swapId = group[swapIndex].id;

    const swapped = working.map((i) => {
      if (i.id === item.id) return { ...i, orderFooter: swapIndex };
      if (i.id === swapId) return { ...i, orderFooter: index };
      return i;
    });
    const normalized = normalizeFooterOrders(swapped);
    setNavItems(normalized);
    try {
      await reorderNavbarItems('footer', buildFooterPayload(normalized));
      showToastMessage('Ordem do rodapé salva');
      refreshNav();
    } catch {
      setNavItems(previous);
      setError('Não foi possível salvar a ordem do rodapé.');
    }
  };

  const handleChangeParent = async (item: NavbarItem, parentId: string | null) => {
    const previous = navItems;
    const working = normalizeNavbarOrders(navItems);
    const targetParent = parentId ? working.find((p) => p.id === parentId) : null;
    if (targetParent && !targetParent.isParent) {
      setError('Escolha um item pai válido.');
      return;
    }
    if (targetParent && targetParent.parentId) {
      setError('Profundidade máxima é de 2 níveis.');
      return;
    }
    const cleanParent = parentId === item.id ? null : parentId;
    const nextOrder = working.filter((i) => i.showInNavbar && (i.parentId ?? null) === cleanParent).length;

    const updated = working.map((i) => {
      if (i.id === item.id) return { ...i, parentId: cleanParent, isParent: false, orderNavbar: nextOrder };
      return i;
    });
    const normalized = normalizeNavbarOrders(updated);
    setNavItems(normalized);
    try {
      await reorderNavbarItems('navbar', buildNavbarPayload(normalized));
      showToastMessage(cleanParent ? 'Item movido para submenu' : 'Item movido para raiz');
      refreshNav();
    } catch {
      setNavItems(previous);
      setError('Não foi possível alterar o submenu.');
    }
  };

  const handleToggleNavbar = async (item: NavbarItem) => {
    const previous = navItems;
    const maxOrder = Math.max(0, ...navItems.map((n) => n.orderNavbar ?? 0));
    const toggled = navItems.map((i) =>
      i.id === item.id
        ? {
            ...i,
            showInNavbar: !i.showInNavbar,
            parentId: !i.showInNavbar ? null : i.parentId,
            orderNavbar: i.showInNavbar ? i.orderNavbar : maxOrder + 1
          }
        : i
    );
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: { showInNavbar: !item.showInNavbar, parentId: !item.showInNavbar ? null : item.parentId }
      });
      refreshNav();
    } catch {
      setNavItems(previous);
    }
  };

  const handleToggleFooter = async (item: NavbarItem) => {
    const previous = navItems;
    const maxOrder = Math.max(0, ...navItems.map((n) => n.orderFooter ?? 0));
    const toggled = navItems.map((i) =>
      i.id === item.id
        ? { ...i, showInFooter: !i.showInFooter, orderFooter: !i.showInFooter ? maxOrder + 1 : i.orderFooter }
        : i
    );
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: { showInFooter: !item.showInFooter }
      });
      refreshNav();
    } catch {
      setNavItems(previous);
    }
  };

  const handleToggleVisible = async (item: NavbarItem) => {
    const previous = navItems;
    const toggled = navItems.map((i) => (i.id === item.id ? { ...i, isVisible: !item.isVisible } : i));
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { isVisible: !item.isVisible } });
    } catch {
      setNavItems(previous);
    }
  };

  const handleAddChild = (parent: NavbarItem) => {
    setEditing(null);
    setForm({
      label: '',
      type: 'INTERNAL_PAGE',
      pageKey: '',
      url: '',
      isParent: false,
      showInNavbar: true,
      showInFooter: false,
      parentId: parent.id,
      isVisible: true
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (item: NavbarItem) => {
    setEditing(item);
    setForm({
      label: item.label,
      type: item.type,
      pageKey: item.pageKey ?? '',
      url: item.url ?? '',
      isParent: item.isParent,
      showInNavbar: item.showInNavbar,
      showInFooter: item.showInFooter,
      parentId: item.parentId ?? null,
      isVisible: item.isVisible
    });
    setShowForm(true);
  };

  const handleSubmitForm = () => {
    setError(null);
    if (!form.label.trim()) {
      setError('Informe um rótulo.');
      return;
    }
    if (form.type === 'INTERNAL_PAGE' && !form.pageKey) {
      setError('Selecione uma página interna.');
      return;
    }
    if (form.type === 'EXTERNAL_URL' && !form.url) {
      setError('Informe uma URL externa.');
      return;
    }
    if (form.isVisible && !form.showInNavbar && !form.showInFooter) {
      setError('Itens visíveis precisam aparecer na navbar ou rodapé.');
      return;
    }

    const payload: Partial<NavbarItem> = {
      label: form.label,
      type: form.type,
      pageKey: form.type === 'INTERNAL_PAGE' ? form.pageKey : undefined,
      url: form.type === 'EXTERNAL_URL' ? form.url : undefined,
      isParent: form.isParent,
      showInNavbar: form.showInNavbar,
      showInFooter: form.showInFooter,
      parentId: form.isParent ? null : form.showInNavbar ? form.parentId : null,
      isVisible: form.isVisible
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const formTitle = editing ? 'Editar item' : 'Adicionar item';

  return (
    <div className="admin-page nav-builder-shell">
      <SeoHead title="Navegação" />
      <div className="nav-builder-header">
        <div>
          <p className="eyebrow">Construtor da navegação</p>
          <h1>Navegação</h1>
          <p className="muted">Organize itens, defina destino e use setas para reordenar.</p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-primary" onClick={openCreate} type="button">
            Adicionar item
          </button>
        </div>
      </div>

      {error && <div className="admin-empty" role="alert">{error}</div>}
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="nav-builder-grid">
        <div className="nav-card">
          <div className="nav-card-header">
            <div>
              <p className="eyebrow">Estrutura</p>
              <h3>Estrutura da navegação</h3>
              <p className="muted small">Use as setas para ordenar; selecione um pai para criar submenus.</p>
            </div>
          </div>
          <NavigationTree
            items={navbarItems}
            onToggleNavbar={handleToggleNavbar}
            onToggleFooter={handleToggleFooter}
            onToggleVisible={handleToggleVisible}
            onEdit={openEdit}
            onDelete={(item) => setDeleteTarget(item)}
            onMoveUp={(item) => moveNavbarItem(item, 'up')}
            onMoveDown={(item) => moveNavbarItem(item, 'down')}
            onChangeParent={handleChangeParent}
            onAddChild={handleAddChild}
          />
        </div>

        <div className="nav-card">
          <div className="nav-card-header">
            <div>
              <p className="eyebrow">Pré-visualização</p>
              <h3>Preview do rodapé</h3>
              <p className="muted small">Somente itens marcados para o rodapé aparecem aqui.</p>
            </div>
          </div>
          <FooterPreview
            items={footerItems}
            onMoveUp={(item) => moveFooterItem(item, 'up')}
            onMoveDown={(item) => moveFooterItem(item, 'down')}
            onToggleVisible={handleToggleVisible}
            onEdit={openEdit}
            onDelete={(item) => setDeleteTarget(item)}
          />
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={formTitle} description="Defina onde o item deve aparecer.">
        <div className="admin-grid">
          <input
            placeholder="Rótulo"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
          />
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as NavigationForm['type'] }))}
          >
            <option value="INTERNAL_PAGE">Página interna</option>
            <option value="EXTERNAL_URL">URL externa</option>
          </select>
          {form.type === 'INTERNAL_PAGE' ? (
            <select
              value={form.pageKey}
              onChange={(e) => setForm((prev) => ({ ...prev, pageKey: e.target.value }))}
            >
              <option value="">Selecione uma página</option>
              {builtInPages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
              {pages?.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.title} — {p.slug}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="URL externa"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
            />
          )}
          <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Switch
              checked={form.showInNavbar}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  showInNavbar: value,
                  parentId: value ? prev.parentId : null
                }))
              }
              label="Mostrar na navbar"
            />
            <Switch
              checked={form.showInFooter}
              onChange={(value) => setForm((prev) => ({ ...prev, showInFooter: value }))}
              label="Mostrar no rodapé"
            />
            <Switch
              checked={form.isVisible}
              onChange={(value) => setForm((prev) => ({ ...prev, isVisible: value }))}
              label="Visível"
            />
            <div>
              <Switch
                checked={form.isParent}
                onChange={(value) => {
                  if (form.parentId) return;
                  setForm((prev) => ({
                    ...prev,
                    isParent: value,
                    parentId: value ? null : prev.parentId,
                    showInNavbar: value ? true : prev.showInNavbar
                  }));
                }}
                label="Item pai"
              />
              {form.parentId && <p className="muted small">Submenus não podem ser itens pai.</p>}
            </div>
          </div>
          {!form.isParent && (
            <div>
              <label htmlFor="parent">Item pai (submenu)</label>
              <select
                id="parent"
                value={form.parentId ?? ''}
                disabled={!form.showInNavbar}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value || null }))}
              >
                <option value="">Nenhum (nível raiz)</option>
                {navbarItems
                  .filter((p) => p.parentId === null && p.showInNavbar && p.isParent)
                  .map((p) => (
                    <option key={p.id} value={p.id} disabled={editing?.id === p.id}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="button" onClick={handleSubmitForm} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover item"
        description="Esta ação também remove subitens vinculados."
        onConfirm={handleDelete}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export const AdminNavbarPage = NavigationBuilderPage;

function buildNavbarPayload(items: NavbarItem[]) {
  const payload: { id: string; parentId: string | null; order: number }[] = [];
  const parents = Array.from(new Set(items.filter((i) => i.showInNavbar).map((i) => i.parentId ?? null)));
  parents.forEach((parentId) => {
    const group = items
      .filter((i) => i.showInNavbar && (i.parentId ?? null) === parentId)
      .sort(sortNavbar);
    group.forEach((item, order) => payload.push({ id: item.id, parentId, order }));
  });
  return payload;
}

function buildFooterPayload(items: NavbarItem[]) {
  const payload: { id: string; parentId: string | null; order: number }[] = [];
  const group = items.filter((i) => i.showInFooter).sort(sortFooter);
  group.forEach((item, order) => payload.push({ id: item.id, parentId: null, order }));
  return payload;
}
