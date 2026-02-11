import { v4 as uuidv4 } from 'uuid';
import type { ServicesBlockData } from '../types';
import { LinkPicker, type LinkPickerValue } from './LinkPicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faTrash } from '@fortawesome/free-solid-svg-icons';

const MAX_ITEMS = 4; // Limite fixo de 4 itens
const MAX_DESCRIPTION = 160;

// Helper para normalizar item do serviço para LinkPickerValue
const normalizeLinkValue = (item: { href: string; linkMode?: 'page' | 'manual'; pageId?: string | null; pageKey?: string | null; slug?: string | null }): LinkPickerValue => {
  // Se já tem linkMode salvo, usar ele
  if (item.linkMode) {
    return {
      mode: item.linkMode,
      href: item.href || '',
      pageId: item.pageId,
      pageKey: item.pageKey,
      slug: item.slug
    };
  }
  
  // Fallback para itens antigos sem linkMode
  if (!item.href || item.href.trim() === '') {
    return { mode: 'manual', href: '' };
  }
  return { mode: 'manual', href: item.href.trim() };
};

export function ServicesBlockForm(_props: { value: ServicesBlockData; onChange: (value: ServicesBlockData) => void }) {
  const { value, onChange } = _props;

  const items = value.items ?? [];

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return;
    const newItem = {
      id: uuidv4(),
      title: 'Novo serviço',
      href: '/servicos/novo-servico'
    };
    onChange({ ...value, items: [...items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    onChange({ ...value, items: items.filter((item) => item.id !== id) });
  };

  const handleUpdateItem = (id: string, updates: Partial<typeof items[number]>) => {
    onChange({
      ...value,
      items: items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    onChange({ ...value, items: updated });
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título da seção</label>
          <input
            value={value.sectionTitle ?? ''}
            onChange={(e) => onChange({ ...value, sectionTitle: e.target.value })}
            placeholder="Serviços"
          />
        </div>

        <div className="editor-field">
          <label>Texto do botão (opcional)</label>
          <input
            value={value.buttonLabel ?? ''}
            onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })}
            placeholder="Saiba mais"
          />
        </div>

        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Itens ({items.length})</label>
            {items.length < MAX_ITEMS && (
              <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                + Adicionar item
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, idx) => (
              <div key={item.id} className="admin-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong className="muted small">Item {idx + 1}</strong>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMoveItem(idx, 'up')}
                      disabled={idx === 0}
                      aria-label="Subir item"
                      title="Subir item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMoveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      aria-label="Descer item"
                      title="Descer item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faArrowDown} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      aria-label="Remover item"
                      title="Remover item"
                      style={{ padding: '0.35rem 0.6rem', color: 'var(--color-ink)' }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Título do serviço
                    </label>
                    <input
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                      placeholder="Ex.: Psicoterapia Junguiana"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <LinkPicker
                      label="Link / slug"
                      value={normalizeLinkValue(item)}
                      onChange={(linkValue) => handleUpdateItem(item.id, { 
                        href: linkValue.href,
                        linkMode: linkValue.mode,
                        pageId: linkValue.pageId,
                        pageKey: linkValue.pageKey,
                        slug: linkValue.slug
                      })}
                    />
                  </div>

                  <div>
                    <label className="small" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Descrição curta</span>
                      <span className="muted">{(item.description ?? '').length}/{MAX_DESCRIPTION}</span>
                    </label>
                    <textarea
                      value={item.description ?? ''}
                      onChange={(e) => handleUpdateItem(item.id, { description: e.target.value.slice(0, MAX_DESCRIPTION) })}
                      placeholder="Escuta simbólica para compreender emoções e padrões."
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <small className="muted" style={{ display: 'block', marginTop: '0.5rem' }}>
            Você pode adicionar de 1 a {MAX_ITEMS} itens. O ícone é sempre a espiral da marca.
          </small>
        </div>
      </div>
    </div>
  );
}
