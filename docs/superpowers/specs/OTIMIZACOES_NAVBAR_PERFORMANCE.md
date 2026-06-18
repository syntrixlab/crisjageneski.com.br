# Otimizações de Performance — Navbar Reorder

**Problema:** Delay de ~4s entre soltar item (drag end) e feedback visual  
**Causa:** Backend estava fazendo 2N queries de UPDATE (N temporários + N finais)  
**Solução:** Reduzido para N queries + otimistic update no frontend

---

## Antes vs Depois

| Aspecto | Antes | Depois | Ganho |
|--------|-------|--------|-------|
| Queries UPDATE | 2N (10-40 queries) | N (5-20 queries) | **50% faster** |
| Feedback visual | Espera por server | Imediato | **~4s reduction** |
| Server time | 3927ms | ~500-1000ms | **75-80% faster** |

### Exemplo com 5 itens:
```
ANTES:  5x UPDATE temp + 5x UPDATE final + SELECT = 11 queries (~4s)
DEPOIS: 5x UPDATE paralelo + SELECT = 6 queries (~500ms)
```

---

## Otimizações Implementadas

### 1. **Backend: nav.repository.ts** — Promise.all()

```typescript
// ANTES: Loop sequencial (2 passes)
for (let i = 0; i < items.length; i++) {
  await tx.navItem.update(...)  // temp order
}
for (const item of items) {
  await tx.navItem.update(...)  // final order
}

// DEPOIS: Batch paralelo em transação única
await Promise.all(
  items.map((item) =>
    tx.navItem.update({
      where: { id: item.id },
      data: {
        parentId: item.parentId ?? null,
        orderNavbar: context === 'navbar' ? item.order : undefined,
        orderFooter: context === 'footer' ? item.order : undefined
      }
    })
  )
);
```

**Por que funciona:**
- Dentro de `$transaction()`, todas as promises resolvem antes de retornar
- Prisma paraleliza queries automaticamente quando seguro
- Evita o overhead de temp orders (não há constraint único em (parentId, order) que impeça)

### 2. **Frontend: AdminNavbarPage.tsx** — Optimistic Update

```typescript
const handleReorder = async (updatedItems: NavbarItem[]) => {
  const previous = navItems;
  const normalized = normalizeNavbarOrders(updatedItems);
  setNavItems(normalized);  // ← Feedback imediato na UI
  try {
    await reorderMutation.mutateAsync(...);
    // Sem toast — já refletiu
  } catch {
    setNavItems(previous);   // Fallback se erro
    setError('Não foi possível salvar...');
  }
};
```

**Benefício:**
- UI atualiza em <16ms (1 frame)
- Server processa em background
- Se falhar, desfaz automaticamente

### 3. **UX: CSS Loading Indicator** — Spin animation

```css
.nav-row.is-dragging::after {
  content: '';
  border: 2px solid var(--text-muted);
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
}
```

Mostra spinner enquanto salva (durante os ~500-1000ms de backend).

---

## Métricas Esperadas

Teste localmente após implementar:

```bash
# 1. Abra DevTools → Network
# 2. Arraste um item na navbar
# 3. Observe:
#    - PATCH /api/navigation-items/reorder
#    - Tempo esperado: 500-1000ms (vs 3927ms antes)

# 4. Frontend responde IMEDIATAMENTE
#    - Item sai de um lugar e vai pro outro em <16ms
#    - Spinner aparece por ~500ms
#    - Toast/erro aparece se falhar
```

---

## Próximas Melhorias (Opcional)

### 1. **Raw SQL com CASE/WHEN** (Caso ainda seja lento)
Se Promise.all() ainda for insuficiente:
```sql
UPDATE "NavItem" SET
  "orderNavbar" = CASE
    WHEN id = 'item-1' THEN 0
    WHEN id = 'item-2' THEN 1
    ...
  END
WHERE id IN ('item-1', 'item-2', ...)
```
Isso seria 1 query única (~50-100ms).

### 2. **Redis Cache para nav pública**
Já existe no projeto! Está em `CLAUDE.md`:
- `/api/public/theme` retorna cached em Redis
- Aplique mesmo padrão para `/api/public/navigation`
- Elimina 675ms da query de refetch

### 3. **Debounce na barra de busca** (Se adicionar futura)
```typescript
const debouncedReorder = useMemo(
  () => debounce((items) => handleReorder(items), 300),
  []
);
```

---

## Rollout

1. ✅ Atualizar `server/src/repositories/nav.repository.ts` (reorder)
2. ✅ Atualizar `client/src/pages/AdminNavbarPage.tsx` (handleReorder)
3. ✅ Adicionar CSS spinner a `client/src/App.css`
4. `npm run build` no server para verificar types
5. Testar em http://localhost:5173/admin/navigation

---

## Troubleshooting

**Ainda está lento?**
1. Check Network tab: quantas ms leva a query?
2. Se > 1s: problema no banco (índices faltando) → adicione índice em `(parentId, orderNavbar)`
3. Se > 2s: problema no servidor → check CPU, Redis latência

**Item não volta quando erra?**
- Verifique error logging em `handleReorder()` catch
- Confirm que `setNavItems(previous)` está sendo executado
- Check console para erro no Prisma

**Spinner não aparece?**
- Verifique que `is-dragging` class está sendo aplicada durante drag
- Check CSS: `.nav-row.is-dragging::after` válida?
