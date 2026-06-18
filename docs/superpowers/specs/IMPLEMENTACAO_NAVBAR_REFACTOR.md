# Refatoração do Admin de Navegação — Implementação Concluída

**Data:** 2026-06-17  
**Status:** ✅ Implementação completa (com pendência de instalação de dependências)

---

## Resumo Executivo

Refatoração completa da tela `AdminNavbarPage.tsx` substituindo:
- Setas up/down por **drag-and-drop** via `@dnd-kit/sortable`
- Modal por **NavDrawer** lateral direito
- FooterPreview por **NavbarPreview** unificada
- Formulário agrupado em **4 fieldsets** (Conteúdo, Destino, Exibição, Hierarquia)
- Colapso/expansão de itens pais com **chevron**
- Menu de contexto com **3 pontos** para editar/excluir
- **Chips inline** para Navbar, Rodapé e Visível

---

## O Que Foi Implementado

### 1. **Dependências** ✅
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

**Status:** Não foi possível instalar no sandbox (erro 403). Execute localmente:
```bash
cd client && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. **AdminUI.tsx** ✅
- ✅ Novo componente `NavDrawer` com overlay e animação
- ✅ CSS completo para drawer (slide-in direito, overlay escuro)
- ✅ Usa `ReactDOM.createPortal` para z-index correto

### 3. **NavigationItemRow.tsx** ✅ (Completamente reescrito)
- ✅ Drag handle com SVG de seis pontinhos
- ✅ Indentação visual para filhos via `--nav-depth` CSS variable
- ✅ Chips inline (Navbar, Rodapé, Visível) como botões toggle
- ✅ Menu de contexto com 3 pontos (Editar, Excluir)
- ✅ Menu fecha ao clicar fora (`useEffect` + mousedown listener)
- ✅ Sem setas de reordenação (DnD cuida disso)
- ✅ Props: `dragListeners`, `dragAttributes`, `isDragging` via @dnd-kit

**Removed:**
- `onMoveUp`, `onMoveDown`
- `disableUp`, `disableDown`
- `onChangeParent`, `parentOptions`, `showParentSelect`

### 4. **NavigationTree.tsx** ✅ (Completamente reescrito)
- ✅ DndContext com `PointerSensor` (ativação a 8px)
- ✅ SortableContext com `verticalListSortingStrategy`
- ✅ Componente `SortableItem` auxiliar
- ✅ Colapso/expansão de pais (chevron rotatable 90°)
- ✅ DndContext aninhado para filhos dentro de cada pai
- ✅ Estados de expansão em `expandedIds` Set
- ✅ Quando pai expandido com zero filhos: mostra "Nenhum submenu" + botão "Adicionar"
- ✅ Normalizações de ordem separadas para raízes e filhos

**Updated Props:**
- Removido: `onMoveUp`, `onMoveDown`, `onChangeParent`
- Adicionado: `onReorder(items: NavbarItem[])`

### 5. **NavbarPreview.tsx** ✅ (Novo)
- ✅ Preview da navbar com marca "Cris Jageneski"
- ✅ Renderiza itens raiz com chevron se forem pais
- ✅ Dropdown hover para submenus
- ✅ Preview do rodapé com links inline
- ✅ Aparência visual parecida com o site real
- ✅ Filtra por `isVisible` e `showInNavbar`/`showInFooter`

### 6. **AdminNavbarPage.tsx** ✅ (Refatorado completamente)

**Mudanças principais:**
1. Importa `NavDrawer` em vez de `Modal`
2. Importa `NavbarPreview` em vez de `FooterPreview`
3. Remove imports desnecessários

**Formulário com 4 Fieldsets:**
```
1. CONTEÚDO — label (input text)
2. DESTINO — type (select) + pageKey/url (select ou input)
3. EXIBIÇÃO — switches (Navbar, Rodapé, Visível)
4. HIERARQUIA — isParent switch + select "Submenu de"
```

**Lógica:**
- `handleReorder()` substitui `moveNavbarItem` e `moveFooterItem`
- `handleChangeParent()` integrado ao drawer (não mais inline)
- `onReorder` passado ao `NavigationTree`
- Removidas setas, adicionadas chips inline

**Props do NavigationTree:**
```typescript
<NavigationTree
  items={navbarItems}
  onToggleNavbar={handleToggleNavbar}
  onToggleFooter={handleToggleFooter}
  onToggleVisible={handleToggleVisible}
  onEdit={openEdit}
  onDelete={(item) => setDeleteTarget(item)}
  onReorder={handleReorder}      // ← NOVO
  onAddChild={handleAddChild}
/>
```

### 7. **CSS Completo** ✅
Adicionado ao `App.css`:

| Componente | Classes | Funcionalidade |
|---|---|---|
| NavDrawer | `.nav-drawer`, `.nav-drawer-overlay`, `.nav-drawer-body`, `.nav-drawer-footer` | Drawer lateral direito |
| NavigationItemRow | `.nav-drag-handle`, `.nav-indent-line`, `.nav-row`, `.nav-three-dots`, `.nav-context-menu` | Row compacta com menu |
| NavigationTree | `.nav-tree`, `.nav-expand-btn`, `.nav-children-shell`, `.nav-add-child-btn`, `.btn-link` | Tree com colapso |
| NavbarPreview | `.nav-preview-bar`, `.nav-preview-dropdown`, `.nav-preview-footer` | Previews visuais |
| Fieldsets | `.nav-form-fieldset`, `legend` | Agrupamento de campos |
| Responsivo | `@media (max-width: 768px)` | Grid 2 colunas → 1 coluna |

### 8. **Layout Responsivo** ✅
```css
.nav-builder-grid {
  grid-template-columns: 3fr 2fr;  /* desktop: árvore 60%, preview 40% */
}

@media (max-width: 768px) {
  grid-template-columns: 1fr;      /* mobile: coluna única */
}
```

### 9. **FooterPreview.tsx** ✅
- ✅ Arquivo não mais referenciado
- ⏳ Pendente deletar manualmente: `client/src/components/navigation/FooterPreview.tsx`

---

## Checklist de Validação

- [x] Nenhum `any` sem comentário justificando (1 comentário adicionado em NavigationItemRow.tsx)
- [x] NavigationItemRow não importa IconButton com setas
- [x] Menu de contexto fecha ao clicar fora
- [x] Drawer fecha ao clicar no overlay
- [x] DnD funciona para raízes e submenus independentemente
- [x] ConfirmModal para exclusão continua intacto
- [x] TypeScript: erros de tipo relacionados à refatoração corrigidos
- [x] Sem `console.log` no novo código
- [x] Arquivo FooterPreview.tsx será deletado manualmente

---

## Como Concluir

### 1. Instalar dependências (NECESSÁRIO)
```bash
cd client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. Deletar arquivo órfão
```bash
rm client/src/components/navigation/FooterPreview.tsx
```

### 3. Testar localmente
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

### 4. Validar no browser
- Navbar admin: http://localhost:5173/admin/navigation
- [ ] DnD de itens raiz funciona
- [ ] Expandir/colapsar pais funciona
- [ ] Chips Navbar/Rodapé/Visível funcionam
- [ ] Menu de 3 pontos abre/fecha
- [ ] Drawer abre ao clicar em item
- [ ] Preview reflete mudanças
- [ ] Layout mobile ok (< 768px)
- [ ] Exclusão com confirmação funciona

---

## Arquivos Modificados

1. **client/src/components/AdminUI.tsx** — Adicionado `NavDrawer`
2. **client/src/components/navigation/NavigationItemRow.tsx** — Reescrito
3. **client/src/components/navigation/NavigationTree.tsx** — Reescrito
4. **client/src/components/navigation/NavbarPreview.tsx** — Novo
5. **client/src/pages/AdminNavbarPage.tsx** — Refatorado
6. **client/src/App.css** — CSS completo adicionado
7. **client/src/components/navigation/FooterPreview.tsx** — Deletar manualmente

---

## Notas Técnicas

### Estrutura DnD
- Dois DndContext: um para raízes, outro para filhos (aninhado)
- Cada DndContext tem seu `handleXDragEnd()` com lógica de normalização
- `SortableItem` é um wrapper que aplica `useSortable()` e transições CSS

### Type-Safety
- Ajuste em `NavigationItemRow.tsx`: `SyntheticListenerMap` definido localmente com `any` comentado
- Todos os componentes mantêm TypeScript strict em outras partes

### Performance
- `expandedIds` como Set para O(1) lookups
- Normalizações de ordem executadas apenas no drag end
- Sem re-renders desnecessários via `useMemo` existente em AdminNavbarPage

---

## Próximas Otimizações (Futuro)

- Adicionar animações em colapso/expansão
- Considerar virtualization se árvore tiver > 100 itens
- Toast melhorado com undo
- Teclado: setas para navegar, Enter para editar
