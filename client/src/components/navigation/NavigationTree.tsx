import type { NavbarItem } from '../../types';
import { NavigationItemRow } from './NavigationItemRow';

type NavigationTreeProps = {
  items: NavbarItem[];
  onToggleNavbar: (item: NavbarItem) => void;
  onToggleFooter: (item: NavbarItem) => void;
  onToggleVisible: (item: NavbarItem) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
  onMoveUp: (item: NavbarItem) => void;
  onMoveDown: (item: NavbarItem) => void;
  onChangeParent: (item: NavbarItem, parentId: string | null) => void;
  onAddChild: (parent: NavbarItem) => void;
};

const sortByOrder = (a: NavbarItem, b: NavbarItem) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);

export function NavigationTree({
  items,
  onToggleNavbar,
  onToggleFooter,
  onToggleVisible,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeParent,
  onAddChild
}: NavigationTreeProps) {
  const roots = items.filter((i) => i.showInNavbar && i.parentId === null).sort(sortByOrder);
  const parentOptions = items
    .filter((i) => i.showInNavbar && i.isParent && i.parentId === null)
    .map((r) => ({ id: r.id, label: r.label }));
  const childrenMap = items.reduce<Record<string, NavbarItem[]>>((acc, item) => {
    if (item.parentId) {
      acc[item.parentId] = acc[item.parentId] || [];
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});
  Object.values(childrenMap).forEach((group) => group.sort(sortByOrder));

  return (
    <div className="nav-tree">
      {roots.length === 0 && <div className="admin-empty">Nenhum item na navegação.</div>}
      {roots.map((item, rootIndex) => {
        const children = childrenMap[item.id] ?? [];
        return (
          <div key={item.id} className="nav-tree-node">
            <NavigationItemRow
              item={item}
              depth={0}
              disableUp={rootIndex === 0}
              disableDown={rootIndex === roots.length - 1}
              onMoveUp={() => onMoveUp(item)}
              onMoveDown={() => onMoveDown(item)}
              onToggleNavbar={() => onToggleNavbar(item)}
              onToggleFooter={() => onToggleFooter(item)}
              onToggleVisible={() => onToggleVisible(item)}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              parentOptions={parentOptions.filter((opt) => opt.id !== item.id)}
              currentParentId={item.parentId ?? null}
              onChangeParent={(parentId) => onChangeParent(item, parentId)}
              showParentSelect={!item.isParent}
            />
            {item.isParent && (
              <div className="nav-children-shell">
                <div className="nav-children-header">
                  <span className="muted small">Submenus</span>
                  <button className="btn btn-outline small" type="button" onClick={() => onAddChild(item)}>
                    Adicionar submenu
                  </button>
                </div>
                {children.length === 0 && <div className="admin-empty small">Nenhum submenu.</div>}
                {children.map((child, childIndex) => (
                  <NavigationItemRow
                    key={child.id}
                    item={child}
                    depth={1}
                    disableUp={childIndex === 0}
                    disableDown={childIndex === children.length - 1}
                    onMoveUp={() => onMoveUp(child)}
                    onMoveDown={() => onMoveDown(child)}
                    onToggleNavbar={() => onToggleNavbar(child)}
                    onToggleFooter={() => onToggleFooter(child)}
                    onToggleVisible={() => onToggleVisible(child)}
                    onEdit={() => onEdit(child)}
                    onDelete={() => onDelete(child)}
                    parentOptions={parentOptions.filter((opt) => opt.id !== child.id)}
                    currentParentId={child.parentId ?? null}
                    onChangeParent={(parentId) => onChangeParent(child, parentId)}
                    showParentSelect={!child.isParent}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
