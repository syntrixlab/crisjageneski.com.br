import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type RefObject } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faTrash, faUpload } from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal, Switch } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { ImageCropModal } from '../components/ImageCropModal';
import { SocialLinksEditor } from '../components/SocialLinksEditor';
import { uploadMedia } from '../api/queries';
import { useAdminSiteSettings, useUpdateSiteSettings } from '../hooks/queries/useSiteSettings';
import type { SiteSettings } from '../types';
import {
  ALLOWED_LOGO_TYPES,
  LOGO_ASPECT,
  LOGO_HEIGHT,
  LOGO_MAX_FILE_SIZE_MB,
  LOGO_OUTPUT_MIME,
  LOGO_WIDTH
} from '../constants';
import '../App.css';

type CropTask = { src: string; file: File };
type SettingsSetter = Dispatch<SetStateAction<SiteSettings>>;

const maxLogoBytes = LOGO_MAX_FILE_SIZE_MB * 1024 * 1024;

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validateLogo(file: File) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) return 'Use PNG, WEBP ou JPG.';
  if (file.size > maxLogoBytes) return `Arquivo maior que ${LOGO_MAX_FILE_SIZE_MB}MB.`;
  return null;
}

function WhatsAppFloatingCard({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  const position = settings.whatsappPosition === 'left' ? 'left' : 'right';

  return (
    <div className="admin-card" style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <strong>Botão flutuante WhatsApp</strong>
          <p className="muted" style={{ margin: 0 }}>Mostra o botão flutuante do WhatsApp em todas as páginas públicas.</p>
        </div>
        <Switch
          checked={!!settings.whatsappEnabled}
          onChange={(checked) => setSettings((prev) => ({ ...prev, whatsappEnabled: checked }))}
        />
      </div>

      <div className="form-field">
        <label>Link/Telefone</label>
        <input
          value={settings.whatsappLink ?? ''}
          onChange={(e) => setSettings((prev) => ({ ...prev, whatsappLink: e.target.value }))}
          placeholder="https://wa.me/55DDDNUMERO"
          disabled={!settings.whatsappEnabled}
        />
      </div>

      <div className="form-field">
        <label>Mensagem padrão (opcional)</label>
        <textarea
          value={settings.whatsappMessage ?? ''}
          onChange={(e) => setSettings((prev) => ({ ...prev, whatsappMessage: e.target.value }))}
          rows={2}
          placeholder="Olá, quero agendar uma sessão..."
          disabled={!settings.whatsappEnabled}
        />
      </div>

      <div className="form-field">
        <label>Posição</label>
        <div className="page-columns-toggle compact">
          {['right', 'left'].map((pos) => (
            <button
              key={pos}
              type="button"
              className={position === pos ? 'active' : ''}
              onClick={() => setSettings((prev) => ({ ...prev, whatsappPosition: pos as 'right' | 'left' }))}
              aria-pressed={position === pos}
              disabled={!settings.whatsappEnabled}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FontAwesomeIcon icon={pos === 'right' ? faArrowRight : faArrowLeft} />
              <span>{pos === 'right' ? 'Direita' : 'Esquerda'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavbarCtaCard({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  return (
    <div className="admin-card" style={{ display: 'grid', gap: '0.75rem', alignContent: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <strong>Ocultar botão Agendar na navbar</strong>
          <p className="muted" style={{ margin: 0 }}>
            Quando ativado, o site não exibe o botão Agendar (desktop e mobile).
          </p>
        </div>
        <Switch
          checked={!!settings.hideScheduleCta}
          onChange={(checked) => setSettings((prev) => ({ ...prev, hideScheduleCta: checked }))}
        />
      </div>
    </div>
  );
}

function SiteLogoCard({
  logoPreview,
  logoError,
  saving,
  logoInputRef,
  onLogoChange,
  onRemoveLogo,
  brandTagline,
  onTaglineChange
}: {
  logoPreview: string | null;
  logoError: string | null;
  saving: boolean;
  logoInputRef: RefObject<HTMLInputElement | null>;
  onLogoChange: (file: File | null) => void;
  onRemoveLogo: () => void;
  brandTagline: string;
  onTaglineChange: (value: string) => void;
}) {
  const taglineCount = brandTagline.length;

  return (
    <div className="admin-card" style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <strong>Logo do site</strong>
          <p className="muted" style={{ margin: '0.15rem 0 0' }}>
            Proporção 1:1, exportamos em {LOGO_WIDTH}x{LOGO_HEIGHT} PNG para preservar transparência.
          </p>
        </div>
        <div className="cover-upload-actions">
          <input
            type="file"
            accept={ALLOWED_LOGO_TYPES.join(',')}
            ref={logoInputRef}
            id="logo-upload"
            style={{ display: 'none' }}
            onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
          />
          <label className="icon-button" htmlFor="logo-upload" aria-label="Trocar logo" title="Trocar logo">
            <FontAwesomeIcon icon={faUpload} />
          </label>
          {logoPreview && (
            <button
              className="icon-button tone-danger"
              type="button"
              onClick={onRemoveLogo}
              disabled={saving}
              aria-label="Remover logo"
              title="Remover logo"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      </div>
      <div className="form-field">
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Tagline da marca</span>
          <span className="muted small">{taglineCount}/80</span>
        </label>
        <input
          value={brandTagline}
          onChange={(e) => onTaglineChange(e.target.value.slice(0, 80))}
          placeholder="Ex.: Psicologia Junguiana"
          maxLength={80}
        />
        <p className="muted small" style={{ margin: 0 }}>Texto pequeno exibido abaixo do nome no menu.</p>
      </div>
      <div className="cover-preview-box" style={{ aspectRatio: '1 / 1', maxWidth: 220, width: '100%', margin: '0 auto' }}>
        {logoPreview ? <img src={logoPreview} alt="Logo do site" /> : <div className="cover-placeholder">Sem logo</div>}
      </div>
      {logoError && <div className="admin-empty" role="alert">{logoError}</div>}
    </div>
  );
}

export function AdminSettingsPage() {
  const { data, isLoading } = useAdminSiteSettings();
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: '',
    cnpj: '',
    crp: '',
    contactEmail: '',
    logoUrl: null,
    socials: [],
    whatsappEnabled: false,
    whatsappLink: '',
    whatsappMessage: '',
    whatsappPosition: 'right',
    hideScheduleCta: false,
    brandTagline: ''
  });
  const [saving, setSaving] = useState(false);
  const [logoTask, setLogoTask] = useState<CropTask | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showLogoConfirm, setShowLogoConfirm] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (data) {
      setSettings(data);
      setLogoPreview(data.logoUrl ?? null);
    }
  }, [data]);

  useEffect(() => {
    if (!logoTask?.src) return undefined;
    return () => URL.revokeObjectURL(logoTask.src);
  }, [logoTask?.src]);

  const mutation = useUpdateSiteSettings();

  const handleLogoChange = (file: File | null) => {
    if (!file) return;
    const error = validateLogo(file);
    if (error) {
      setLogoError(error);
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    setLogoError(null);
    setLogoTask({ src: URL.createObjectURL(file), file });
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoConfirm = async (file: File) => {
    setSaving(true);
    try {
      const uploaded = await uploadMedia({ file, alt: `${settings.siteName || 'Logo do site'}` });
      setSettings((prev) => ({ ...prev, logoUrl: uploaded.url }));
      setLogoPreview(uploaded.url);
      setLogoTask(null);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoRemove = () => {
    setSettings((prev) => ({ ...prev, logoUrl: null }));
    setLogoPreview(null);
    setShowLogoConfirm(false);
  };

  const sortedSocials = [...(settings.socials ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isValid =
    settings.siteName.trim().length > 1 &&
    (!settings.cnpj || settings.cnpj.replace(/\D/g, '').length === 14) &&
    (!settings.contactEmail || settings.contactEmail.includes('@'));

  const handleSubmit = async () => {
    setSaving(true);
    setLogoError(null);
    try {
      const updated = await mutation.mutateAsync({
        ...settings,
        cnpj: settings.cnpj ? settings.cnpj.replace(/\D/g, '') : null,
        contactEmail: settings.contactEmail?.trim() || null,
        socials: sortedSocials
      });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <SeoHead title="Configurações do Site" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Configurações do Site</h1>
        <p className="muted" style={{ margin: 0 }}>
          Nome, CNPJ, logo e redes sociais exibidas no site.
        </p>
      </div>

      <div className="admin-card" style={{ display: 'grid', gap: '1rem' }}>
        {isLoading ? (
          <div className="admin-empty">Carregando configurações...</div>
        ) : (
          <>
            <div className="admin-grid columns-2">
              <div className="form-field">
                <label>Nome do site</label>
                <input
                  value={settings.siteName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, siteName: e.target.value }))}
                  placeholder="Ex.: Cris Jageneski"
                />
              </div>
              <div className="form-field">
                <label>CNPJ</label>
                <input
                  value={formatCnpj(settings.cnpj ?? '')}
                  onChange={(e) => setSettings((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="form-field">
                <label>CRP</label>
                <input
                  value={settings.crp ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, crp: e.target.value }))}
                  placeholder="CRP opcional"
                />
              </div>
              <div className="form-field">
                <label>Email de contato</label>
                <input
                  type="email"
                  value={settings.contactEmail ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contato@exemplo.com"
                />
              </div>
            </div>

            <div className="admin-grid columns-3" style={{ marginTop: '1rem' }}>
              <WhatsAppFloatingCard settings={settings} setSettings={setSettings} />
              <SiteLogoCard
                logoPreview={logoPreview}
                logoError={logoError}
                saving={saving}
                logoInputRef={logoInputRef}
                onLogoChange={handleLogoChange}
                onRemoveLogo={() => setShowLogoConfirm(true)}
                brandTagline={settings.brandTagline ?? ''}
                onTaglineChange={(value) => setSettings((prev) => ({ ...prev, brandTagline: value }))}
              />
              <NavbarCtaCard settings={settings} setSettings={setSettings} />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <SocialLinksEditor
                socials={settings.socials ?? []}
                onChange={(socials) => setSettings((prev) => ({ ...prev, socials }))}
              />
            </div>

            <div className="admin-modal-footer" style={{ padding: 0 }}>
              <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={!isValid || saving || mutation.isPending}>
                {saving || mutation.isPending ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </>
        )}
      </div>

      <ImageCropModal
        open={!!logoTask}
        imageSrc={logoTask?.src}
        imageFile={logoTask?.file}
        aspect={LOGO_ASPECT}
        outputWidth={LOGO_WIDTH}
        outputHeight={LOGO_HEIGHT}
        mimeType={LOGO_OUTPUT_MIME}
        onCancel={() => setLogoTask(null)}
        onConfirm={(file) => handleLogoConfirm(file)}
        title="Recortar logo"
        confirmLabel="Salvar logo"
      />

      <ConfirmModal
        isOpen={showLogoConfirm}
        onClose={() => setShowLogoConfirm(false)}
        title="Remover logo"
        description="Tem certeza que deseja remover o logo? Essa ação não pode ser desfeita."
        onConfirm={handleLogoRemove}
        confirmLabel="Remover"
      />

    </div>
  );
}
