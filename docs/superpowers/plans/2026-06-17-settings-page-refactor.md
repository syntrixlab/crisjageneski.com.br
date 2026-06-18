# Plano — Refatoração da Tela de Configurações

**Data:** 2026-06-17  
**Arquivo principal:** `client/src/pages/AdminSettingsPage.tsx`  
**Objetivo:** tornar a tela mais densa, profissional e útil, com tipografia via Google Fonts, novos campos e layout coerente.

---

## Problemas atuais

- **Tabs horizontais** não escalam bem conforme novas seções são adicionadas
- **"Dados profissionais"** tem só CNPJ e CRP — fica com metade da tela vazia
- **Nenhuma personalização de tipografia** — só cores
- **Preview de aparência pequeno** e sem refletir fonte
- **Sem indicador de alterações não salvas** — usuário pode trocar de aba sem perceber que ainda não salvou
- **Sem campos de SEO** — meta description, OG image, Google Analytics
- **Logo preview muito pequeno** — caixa pequena e sem área clara de drop

---

## Nova estrutura de seções (5 seções)

| Seção | Era | O que muda |
|---|---|---|
| **Identidade** | "Marca" | + favicon, logo maior |
| **Aparência** | "Personalização" | + tipografia Google Fonts, preview maior |
| **Contato e redes** | igual | sem mudança estrutural |
| **Dados profissionais** | expandida | + endereço, telefone, horários de atendimento |
| **SEO e integrações** | nova | meta description, OG image, Google Analytics, Search Console |

---

## Layout visual

### Desktop
```
┌──────────────────────────────────────────────────────────────┐
│  Configurações                          [● Salvar]           │
├──────────┬───────────────────────────────────────────────────┤
│          │                                                    │
│ ○ Identidade      [campos da seção ativa]                    │
│ ● Aparência  ←                                               │
│ ○ Contato                                                    │
│ ○ Dados prof.                                                │
│ ○ SEO                                                        │
│          │                                                    │
└──────────┴───────────────────────────────────────────────────┘
```

Sidebar vertical fixa à esquerda (~200px), conteúdo ocupa o restante. Na aba Aparência, o preview fica em coluna lateral sticky (~360px).

### Mobile (< 768px)
- Sidebar vira pills/chips horizontais roláveis no topo
- Preview some (ou colapsa abaixo dos campos)

---

## Passo 1 — Backend: novos campos no schema

**Arquivo:** `server/prisma/schema.prisma`

Adicionar ao model `SiteSettings`:

```prisma
model SiteSettings {
  // campos existentes mantidos...

  // Dados profissionais expandidos
  phone             String?
  address           Json?    // { street?, city?, state?, zip? }
  officeHours       Json?    // Array<{ label: string; hours: string }>

  // SEO e integrações
  metaDescription   String?  @db.VarChar(320)
  ogImageUrl        String?
  gaId              String?   // "G-XXXXXXXXXX" ou "UA-XXXXX-X"
  gscVerification   String?   // valor do meta tag do Search Console
}
```

Tipografia **não precisa de nova coluna** — vai dentro do campo `theme` (já é Json):
```json
{
  "preset": "vinho-suave",
  "colors": { ... },
  "typography": {
    "headingFont": "Playfair Display",
    "bodyFont": "Inter"
  }
}
```

Rodar migration:
```bash
npx prisma migrate dev --name add-settings-professional-seo-fields
```

---

## Passo 2 — Tipografia no `siteTheme.ts`

**Arquivo:** `client/src/utils/siteTheme.ts` e `server/src/utils/siteTheme.ts`

### Tipos novos

```typescript
export type SiteTypography = {
  headingFont: string | null;
  bodyFont: string | null;
};

// Expandir SiteTheme existente:
export type SiteTheme = {
  preset: SiteThemePreset;
  colors: SiteThemeColors;
  typography?: SiteTypography; // NOVO
};
```

### Expandir `normalizeSiteTheme`

```typescript
export function normalizeSiteTheme(value?: unknown): SiteTheme {
  // ... lógica existente de preset + colors ...
  
  const rawTypography = isThemeObject(raw.typography) ? raw.typography : {};
  const headingFont = typeof rawTypography.headingFont === 'string' && rawTypography.headingFont.trim()
    ? rawTypography.headingFont.trim()
    : null;
  const bodyFont = typeof rawTypography.bodyFont === 'string' && rawTypography.bodyFont.trim()
    ? rawTypography.bodyFont.trim()
    : null;

  return {
    preset,
    colors: { ... },
    typography: { headingFont, bodyFont }
  };
}
```

### Expandir `siteThemeToCssVars`

Adicionar ao objeto retornado:

```typescript
'--font-heading': typography?.headingFont
  ? `'${typography.headingFont}', Georgia, serif`
  : 'var(--font-serif, Georgia, serif)',
'--font-body': typography?.bodyFont
  ? `'${typography.bodyFont}', system-ui, sans-serif`
  : 'var(--font-sans, system-ui, sans-serif)',
```

---

## Passo 3 — Carregar Google Fonts no site público

**Arquivo:** `client/src/components/PublicLayout.tsx`

Adicionar `useEffect` que injeta o `<link>` do Google Fonts quando a tipografia estiver configurada:

```tsx
useEffect(() => {
  const typography = currentSettings?.theme?.typography;
  const fonts: string[] = [];
  if (typography?.headingFont) {
    fonts.push(`family=${encodeURIComponent(typography.headingFont)}:wght@400;600;700`);
  }
  if (typography?.bodyFont) {
    fonts.push(`family=${encodeURIComponent(typography.bodyFont)}:wght@400;500`);
  }
  if (!fonts.length) return;

  const existing = document.getElementById('gfonts-dynamic');
  if (existing) existing.remove();

  const link = document.createElement('link');
  link.id = 'gfonts-dynamic';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${fonts.join('&')}&display=swap`;
  document.head.appendChild(link);

  return () => {
    document.getElementById('gfonts-dynamic')?.remove();
  };
}, [currentSettings?.theme?.typography?.headingFont, currentSettings?.theme?.typography?.bodyFont]);
```

Também adicionar preconnect no `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## Passo 4 — Lista curada de fontes Google

**Arquivo novo:** `client/src/constants/googleFonts.ts`

Lista de ~30 fontes adequadas para clínica de psicologia/saúde/bem-estar:

```typescript
export const GOOGLE_FONTS_HEADINGS = [
  { name: 'Playfair Display', category: 'Serif', preview: 'Aa' },
  { name: 'Cormorant Garamond', category: 'Serif', preview: 'Aa' },
  { name: 'Merriweather', category: 'Serif', preview: 'Aa' },
  { name: 'Lora', category: 'Serif', preview: 'Aa' },
  { name: 'EB Garamond', category: 'Serif', preview: 'Aa' },
  { name: 'Libre Baskerville', category: 'Serif', preview: 'Aa' },
  { name: 'DM Serif Display', category: 'Serif', preview: 'Aa' },
  { name: 'Spectral', category: 'Serif', preview: 'Aa' },
  { name: 'Crimson Text', category: 'Serif', preview: 'Aa' },
  { name: 'Cinzel', category: 'Serif', preview: 'Aa' },
  { name: 'Raleway', category: 'Sans-Serif', preview: 'Aa' },
  { name: 'Josefin Sans', category: 'Sans-Serif', preview: 'Aa' },
  { name: 'Montserrat', category: 'Sans-Serif', preview: 'Aa' },
];

export const GOOGLE_FONTS_BODY = [
  { name: 'Inter', category: 'Sans-Serif' },
  { name: 'DM Sans', category: 'Sans-Serif' },
  { name: 'Nunito', category: 'Sans-Serif' },
  { name: 'Open Sans', category: 'Sans-Serif' },
  { name: 'Lato', category: 'Sans-Serif' },
  { name: 'Raleway', category: 'Sans-Serif' },
  { name: 'Source Sans 3', category: 'Sans-Serif' },
  { name: 'Jost', category: 'Sans-Serif' },
  { name: 'Outfit', category: 'Sans-Serif' },
  { name: 'Karla', category: 'Sans-Serif' },
  { name: 'Mulish', category: 'Sans-Serif' },
  { name: 'Work Sans', category: 'Sans-Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'Merriweather', category: 'Serif' },
];
```

---

## Passo 5 — Componente `FontPicker`

**Arquivo novo:** `client/src/components/FontPicker.tsx`

Seletor de fonte com:
- Input de busca (filtra a lista curada)
- Grid de opções com preview da fonte carregada inline (via Google Fonts CSS param)
- Botão "Usar fonte do sistema" (reseta para null)
- Preview da frase "Fernanda Biscalquim — Psicoterapia Junguiana" renderizada na fonte selecionada

```tsx
type FontPickerProps = {
  value: string | null;
  onChange: (font: string | null) => void;
  options: Array<{ name: string; category: string }>;
  label: string;
  previewText?: string;
};

export function FontPicker({ value, onChange, options, label, previewText }: FontPickerProps) {
  const [search, setSearch] = useState('');
  const filtered = options.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="font-picker">
      <label className="font-picker-label">{label}</label>
      
      {/* Preview da fonte atual */}
      {value && (
        <FontLoader fonts={[value]} />
      )}
      <div
        className="font-picker-preview"
        style={{ fontFamily: value ? `'${value}', serif` : 'inherit' }}
      >
        {previewText ?? 'Psicologia para vidas com mais sentido'}
      </div>

      {/* Campo de busca */}
      <input
        placeholder="Buscar fonte..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="font-picker-search"
      />

      {/* Lista */}
      <div className="font-picker-list" role="listbox" aria-label={label}>
        <button
          role="option"
          type="button"
          className={`font-picker-option ${!value ? 'is-selected' : ''}`}
          onClick={() => onChange(null)}
          aria-selected={!value}
        >
          <span className="font-picker-name">Padrão do sistema</span>
          <span className="font-picker-category muted small">System UI</span>
        </button>
        {filtered.map((font) => (
          <FontPickerOption
            key={font.name}
            font={font}
            selected={value === font.name}
            onSelect={() => onChange(font.name)}
          />
        ))}
      </div>
    </div>
  );
}

// Carrega a fonte inline para o preview da lista
function FontPickerOption({ font, selected, onSelect }: { font: { name: string; category: string }; selected: boolean; onSelect: () => void }) {
  useEffect(() => {
    const id = `gfont-preview-${font.name.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400&display=swap`;
    document.head.appendChild(link);
  }, [font.name]);

  return (
    <button
      role="option"
      type="button"
      className={`font-picker-option ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      aria-selected={selected}
    >
      <span className="font-picker-name" style={{ fontFamily: `'${font.name}', serif` }}>
        {font.name}
      </span>
      <span className="font-picker-category muted small">{font.category}</span>
    </button>
  );
}
```

---

## Passo 6 — Refatorar `AdminSettingsPage.tsx`

### 6a. Trocar tabs horizontais por sidebar vertical

Substituir `SettingsTabs` (botões em linha) por `SettingsSidebar` (nav vertical):

```tsx
const SETTINGS_SECTIONS = [
  { id: 'identity', label: 'Identidade', icon: '◈' },
  { id: 'appearance', label: 'Aparência', icon: '⬡' },
  { id: 'contact', label: 'Contato e redes', icon: '⌘' },
  { id: 'professional', label: 'Dados profissionais', icon: '⊡' },
  { id: 'seo', label: 'SEO e integrações', icon: '◎' },
] as const;

function SettingsSidebar({ active, isDirty, onChange }) {
  return (
    <nav className="settings-sidebar" aria-label="Seções de configurações">
      {SETTINGS_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`settings-sidebar-item ${active === section.id ? 'is-active' : ''}`}
          onClick={() => onChange(section.id)}
        >
          <span className="settings-sidebar-icon" aria-hidden="true">{section.icon}</span>
          <span>{section.label}</span>
          {isDirty && active === section.id && (
            <span className="settings-dirty-dot" aria-label="Alterações não salvas" />
          )}
        </button>
      ))}
    </nav>
  );
}
```

### 6b. Indicador de alterações não salvas

Adicionar estado `isDirty`:

```typescript
const isDirty = useMemo(() => {
  if (!data) return false;
  return JSON.stringify(settings) !== JSON.stringify({
    ...data,
    theme: normalizeSiteTheme(data.theme)
  });
}, [settings, data]);
```

Botão Salvar mostra badge e tooltip quando `isDirty`:
```tsx
<button
  className={`btn btn-primary ${isDirty ? 'has-unsaved' : ''}`}
  type="button"
  onClick={handleSubmit}
  disabled={!isValid || saving}
  title={isDirty ? 'Você tem alterações não salvas' : undefined}
>
  {isDirty && <span className="btn-dirty-indicator" aria-hidden="true" />}
  {saving ? 'Salvando...' : 'Salvar configurações'}
</button>
```

### 6c. Nova aba "Identidade" (era "Marca")

Mesmos campos de hoje (nome, tagline, logo), com logo preview maior:
- Preview box aumenta para `180px × 180px` com borda tracejada e área de drop visual
- Favicon: novo campo de upload, formato `.ico` ou `.png` 32×32

### 6d. Nova seção "Tipografia" dentro de "Aparência"

Dentro de `AppearanceSettingsTab`, adicionar após os campos de cor:

```tsx
<div className="settings-section-card">
  <div className="settings-section-card-header">
    <div>
      <strong>Tipografia</strong>
      <p className="muted" style={{ margin: 0 }}>
        Fontes carregadas do Google Fonts. Só aparecem no site após salvar.
      </p>
    </div>
  </div>

  <div className="admin-grid columns-2">
    <FontPicker
      label="Fonte para títulos"
      value={theme.typography?.headingFont ?? null}
      options={GOOGLE_FONTS_HEADINGS}
      previewText="Psicologia para vidas com mais sentido"
      onChange={(font) => setTheme({
        ...theme,
        typography: { ...theme.typography, headingFont: font }
      })}
    />
    <FontPicker
      label="Fonte para corpo de texto"
      value={theme.typography?.bodyFont ?? null}
      options={GOOGLE_FONTS_BODY}
      previewText="Acompanhamento psicológico com foco no autoconhecimento."
      onChange={(font) => setTheme({
        ...theme,
        typography: { ...theme.typography, bodyFont: font }
      })}
    />
  </div>
</div>
```

### 6e. Preview de aparência com fontes

O `theme-preview` já usa `siteThemeToCssVars(theme)`. Com a expansão do `siteThemeToCssVars` para incluir `--font-heading` e `--font-body` (Passo 2), o preview refletirá automaticamente a tipografia ao vivo — desde que o `FontPicker` já tenha carregado a fonte via Google Fonts (ele já faz isso por item selecionado).

Mover o preview para uma coluna lateral sticky:

```tsx
<div className="settings-appearance-layout">
  <div className="settings-appearance-controls">
    {/* paletas, cores, tipografia */}
  </div>
  <div className="settings-appearance-preview-sticky">
    <AppearancePreview theme={theme} settings={settings} />
  </div>
</div>
```

CSS:
```css
.settings-appearance-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 1.5rem;
  align-items: start;
}
.settings-appearance-preview-sticky {
  position: sticky;
  top: 1.5rem;
}
@media (max-width: 900px) {
  .settings-appearance-layout { grid-template-columns: 1fr; }
  .settings-appearance-preview-sticky { position: static; }
}
```

### 6f. "Dados profissionais" expandida

```tsx
function ProfessionalDataSettingsTab({ settings, setSettings }) {
  return (
    <div className="settings-tab-grid">
      <div className="admin-card settings-panel-card">
        <h2>Identificação</h2>
        <div className="admin-grid columns-2">
          <FormField label="CNPJ">
            <input value={formatCnpj(settings.cnpj ?? '')} onChange={...} placeholder="00.000.000/0000-00" />
          </FormField>
          <FormField label="CRP">
            <input value={settings.crp ?? ''} onChange={...} placeholder="CRP opcional" />
          </FormField>
          <FormField label="Telefone de contato">
            <input value={settings.phone ?? ''} onChange={...} placeholder="(11) 99999-9999" />
          </FormField>
        </div>
      </div>

      <div className="admin-card settings-panel-card">
        <h2>Endereço</h2>
        <div className="admin-grid columns-2">
          <FormField label="Rua / Logradouro">
            <input value={settings.address?.street ?? ''} onChange={...} placeholder="Rua das Flores, 123" />
          </FormField>
          <FormField label="CEP">
            <input value={settings.address?.zip ?? ''} onChange={...} placeholder="00000-000" />
          </FormField>
          <FormField label="Cidade">
            <input value={settings.address?.city ?? ''} onChange={...} placeholder="São Paulo" />
          </FormField>
          <FormField label="Estado">
            <input value={settings.address?.state ?? ''} onChange={...} placeholder="SP" maxLength={2} />
          </FormField>
        </div>
      </div>

      <div className="admin-card settings-panel-card">
        <h2>Horários de atendimento</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Exibidos na página de contato. Adicione um período por linha.
        </p>
        <OfficeHoursEditor
          value={settings.officeHours ?? []}
          onChange={(officeHours) => setSettings((prev) => ({ ...prev, officeHours }))}
        />
      </div>
    </div>
  );
}
```

`OfficeHoursEditor` é um componente simples de lista editável:
- Cada item: campo "Período" (ex: "Seg–Sex") + campo "Horário" (ex: "9h–18h")
- Botão "Adicionar horário" e botão de remover por item

### 6g. Nova aba "SEO e integrações"

```tsx
function SeoSettingsTab({ settings, setSettings }) {
  return (
    <div className="settings-tab-grid">
      <div className="admin-card settings-panel-card">
        <h2>SEO</h2>
        <FormField
          label={<><span>Meta description</span><span className="muted small">{(settings.metaDescription ?? '').length}/320</span></>}
          hint="Texto exibido nos resultados de busca do Google. Ideal: 120–160 caracteres."
        >
          <textarea
            value={settings.metaDescription ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, metaDescription: e.target.value.slice(0, 320) }))}
            rows={3}
            placeholder="Atendimento psicológico junguiano em São Paulo..."
          />
        </FormField>
        <FormField
          label="Imagem padrão para compartilhamento (OG Image)"
          hint="Exibida ao compartilhar o site no WhatsApp, LinkedIn, etc. Proporção 1200×630px recomendada."
        >
          {/* Upload simples — reusar lógica do logo */}
          <OgImageUpload value={settings.ogImageUrl ?? null} onChange={...} />
        </FormField>
      </div>

      <div className="admin-card settings-panel-card">
        <h2>Integrações</h2>
        <FormField
          label="Google Analytics (ID de medição)"
          hint="Formato: G-XXXXXXXXXX ou UA-XXXXX-X"
        >
          <input
            value={settings.gaId ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, gaId: e.target.value.trim() }))}
            placeholder="G-XXXXXXXXXX"
          />
        </FormField>
        <FormField
          label="Google Search Console (verificação)"
          hint="Cole apenas o valor do atributo content da meta tag fornecida pelo Search Console."
        >
          <input
            value={settings.gscVerification ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, gscVerification: e.target.value.trim() }))}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </FormField>
      </div>
    </div>
  );
}
```

---

## Passo 7 — Backend: validação e service

**Arquivo:** `server/src/modules/admin/siteSettings.controller.ts`

Adicionar ao `settingsSchema`:

```typescript
const settingsSchema = z.object({
  // campos existentes ...
  phone: z.string().max(20).nullable().optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(2).optional(),
    zip: z.string().max(9).optional(),
  }).nullable().optional(),
  officeHours: z.array(z.object({
    label: z.string().max(50),
    hours: z.string().max(50),
  })).max(10).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
  gaId: z.string().max(30).regex(/^(G-[A-Z0-9]+|UA-\d+-\d+)?$/, 'ID inválido').nullable().optional(),
  gscVerification: z.string().max(100).nullable().optional(),
  // tipografia vai dentro de theme, já validada
});
```

**Arquivo:** `server/src/services/siteSettings.service.ts`

Passar os novos campos no `upsert` e retorná-los em `getPublic`/`getAdmin`.

**Arquivo:** `server/src/utils/siteTheme.ts`

Expandir `normalizeSiteTheme` com tipografia (conforme Passo 2).

---

## Passo 8 — Injetar GA e Search Console no site público

**Arquivo:** `client/src/components/PublicLayout.tsx` ou `index.html` via meta tag dinâmica.

```tsx
// Google Analytics
useEffect(() => {
  if (!currentSettings?.gaId) return;
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${currentSettings.gaId}`;
  script.async = true;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) { window.dataLayer.push(args); }
  gtag('js', new Date());
  gtag('config', currentSettings.gaId);
  return () => script.remove();
}, [currentSettings?.gaId]);

// Search Console verification
useEffect(() => {
  if (!currentSettings?.gscVerification) return;
  const meta = document.createElement('meta');
  meta.name = 'google-site-verification';
  meta.content = currentSettings.gscVerification;
  document.head.appendChild(meta);
  return () => meta.remove();
}, [currentSettings?.gscVerification]);
```

---

## CSS a adicionar

```css
/* Sidebar vertical */
.settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.5rem;
  border-right: 1px solid var(--border);
  min-width: 200px;
}
.settings-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-muted);
  text-align: left;
  position: relative;
  transition: background 120ms, color 120ms;
}
.settings-sidebar-item:hover { background: var(--surface-hover); color: var(--text); }
.settings-sidebar-item.is-active { background: var(--surface-active); color: var(--text); font-weight: 600; }
.settings-dirty-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-primary);
  margin-left: auto;
}

/* Layout com sidebar */
.settings-shell-v2 {
  display: flex;
  min-height: 500px;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* FontPicker */
.font-picker { display: flex; flex-direction: column; gap: 0.5rem; }
.font-picker-preview {
  padding: 0.75rem 1rem;
  background: var(--surface-hover);
  border-radius: 8px;
  font-size: 1.1rem;
  min-height: 48px;
  transition: font-family 200ms;
}
.font-picker-search {
  width: 100%;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
}
.font-picker-list {
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  gap: 0;
}
.font-picker-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 100ms;
}
.font-picker-option:hover { background: var(--surface-hover); }
.font-picker-option.is-selected { background: var(--surface-active); font-weight: 600; }
.font-picker-name { font-size: 0.9rem; }
.font-picker-category { font-size: 0.75rem; }

/* Indicador de dirty no botão */
.btn.has-unsaved { position: relative; }
.btn-dirty-indicator {
  width: 8px; height: 8px; border-radius: 50%;
  background: #fff;
  position: absolute;
  top: -3px; right: -3px;
  border: 2px solid var(--color-primary);
  background: orange;
}

/* Office hours editor */
.office-hours-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .settings-shell-v2 { flex-direction: column; }
  .settings-sidebar {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    min-width: unset;
  }
  .settings-appearance-layout { grid-template-columns: 1fr; }
}
```

---

## Tipos a atualizar em `client/src/types/content.ts`

```typescript
export type OfficeHour = {
  label: string; // "Seg–Sex"
  hours: string; // "9h–18h"
};

export type SiteAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type SiteSettings = {
  siteName: string;
  cnpj?: string | null;
  crp?: string | null;
  phone?: string | null;           // NOVO
  contactEmail?: string | null;
  logoUrl?: string | null;
  address?: SiteAddress | null;    // NOVO
  officeHours?: OfficeHour[] | null; // NOVO
  socials: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
  theme?: SiteTheme | null;
  metaDescription?: string | null; // NOVO
  ogImageUrl?: string | null;      // NOVO
  gaId?: string | null;            // NOVO
  gscVerification?: string | null; // NOVO
};
```

---

## Ordem de execução para o Haiku

1. **Schema + migration** — novos campos no `SiteSettings` do Prisma
2. **`siteTheme.ts` (server + client)** — `SiteTypography`, `normalizeSiteTheme`, `siteThemeToCssVars`
3. **`content.ts` (client)** — tipos `SiteSettings`, `OfficeHour`, `SiteAddress`
4. **`googleFonts.ts`** — lista curada de fontes
5. **`FontPicker.tsx`** — componente de seleção de fonte
6. **`OfficeHoursEditor.tsx`** — componente de lista editável de horários
7. **`siteSettings.controller.ts` (server)** — schema Zod expandido + novos campos no upsert e retorno
8. **`AdminSettingsPage.tsx`** — sidebar, isDirty, 5 abas, tipografia, novos campos
9. **`PublicLayout.tsx`** — Google Fonts dinâmico + GA + GSC
10. **`index.html`** — preconnect para fonts.googleapis.com

---

## Checklist de validação

- [ ] Migration rodou sem erro
- [ ] `normalizeSiteTheme` aceita e retorna `typography` sem quebrar presets existentes
- [ ] `siteThemeToCssVars` emite `--font-heading` e `--font-body`
- [ ] `FontPicker` carrega preview da fonte sem travar (lazy, por item)
- [ ] Google Fonts não é carregado quando `headingFont` e `bodyFont` são `null`
- [ ] `isDirty` detecta corretamente mudanças em todos os campos
- [ ] Novos campos de SEO são enviados e retornados pela API
- [ ] GA só é injetado em produção (`NODE_ENV === 'production'`) para não poluir dados de dev
- [ ] TypeScript strict: sem `any` sem comentário
- [ ] `console.log` removidos
- [ ] Layout responsivo funciona em 375px
