import { ValidationInput, CharCounter } from '@/components/ValidationComponents';
import type { PageForm } from '../hooks/usePageEditor';
import { slugify } from '../hooks/usePageEditor';

export function PageSettingsPanel(_props: {
  page: PageForm;
  setPage: (updater: (prev: PageForm) => PageForm) => void;
  fieldStates: Record<string, { hasError: boolean; errorMessage?: string; isTouched: boolean }>;
  markFieldTouched: (fieldId: string) => void;
}) {
  const { page, setPage, fieldStates, markFieldTouched } = _props;

  return (
    <div className="page-settings-panel">
      <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 600 }}>
        Configurações da Página
      </h3>

      <div className="editor-field" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>
          Título
        </label>
        <ValidationInput
          fieldId="page-title"
          hasError={fieldStates['page-title']?.hasError || false}
          errorMessage={fieldStates['page-title']?.errorMessage}
          showError={fieldStates['page-title']?.isTouched}
        >
          <input
            value={page.title}
            onChange={(e) => setPage((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => markFieldTouched('page-title')}
            placeholder="Título da página"
            style={{ width: '100%' }}
          />
        </ValidationInput>
      </div>

      <div className="editor-field" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>
          Slug
        </label>
        <ValidationInput
          fieldId="page-slug"
          hasError={fieldStates['page-slug']?.hasError || false}
          errorMessage={fieldStates['page-slug']?.errorMessage}
          showError={fieldStates['page-slug']?.isTouched}
        >
          <input
            value={page.slug}
            onChange={(e) => setPage((prev) => ({ ...prev, slug: e.target.value }))}
            onBlur={(e) => {
              markFieldTouched('page-slug');
              setPage((prev) => ({ ...prev, slug: slugify(e.target.value) }));
            }}
            placeholder="ex: sobre, contato, servicos"
            style={{ width: '100%' }}
          />
        </ValidationInput>
        <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.4rem' }}>
          URLs públicas ficam em /p/slug. Use letras minúsculas e hifens.
        </p>
      </div>

      <div className="editor-field" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>
          Descrição
        </label>
        <textarea
          value={page.description ?? ''}
          onChange={(e) => setPage((prev) => ({ ...prev, description: e.target.value }))}
          onBlur={() => markFieldTouched('page-description')}
          rows={3}
          placeholder="Descrição para SEO e redes sociais"
          style={{ width: '100%' }}
        />
        <CharCounter text={page.description || ''} limit={300} />
      </div>
    </div>
  );
}
