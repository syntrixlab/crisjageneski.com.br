import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faTrash, faUpload } from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal, Modal, IconButton, Switch } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { ImageCropModal } from '../components/ImageCropModal';
import { fetchAdminSiteSettings, updateSiteSettings, uploadMedia } from '../api/queries';
import type { SiteSettings, SocialLink } from '../types';
import {
  ALLOWED_LOGO_TYPES,
  LOGO_ASPECT,
  LOGO_HEIGHT,
  LOGO_MAX_FILE_SIZE_MB,
  LOGO_OUTPUT_MIME,
  LOGO_WIDTH
} from '../constants';
import '../App.css';

const socialPlatforms: SocialLink['platform'][] = [
  'instagram',
  'whatsapp',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'email',
  'site',
  'telefone',
  'custom'
] as const;

const platformLabels: Record<SocialLink['platform'], string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  email: 'Email',
  site: 'Website',
  telefone: 'Telefone',
  custom: 'Custom'
};

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

function normalizeSocialLink(link: SocialLink): SocialLink {
  let url = link.url.trim();
  if (link.platform === 'email') {
    url = url.startsWith('mailto:') ? url : `mailto:${url}`;
  } else if (link.platform === 'whatsapp') {
    const digits = url.replace(/\D/g, '');
    url = `https://wa.me/${digits}`;
  } else if (link.platform === 'telefone') {
    const digits = url.replace(/\D/g, '');
    url = `tel:${digits}`;
  } else if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return { ...link, url };
}

function SocialIcon({ platform }: { platform: SocialLink['platform'] }) {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1" fill="currentColor" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v5h4v-5h3l1-4h-4v-3a1 1 0 0 1 1-1z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1 9.75v2.5A29 29 0 0 0 1.46 17.6a2.78 2.78 0 0 0 1.95 2C5.12 20 12 20 12 20s6.88 0 8.59-.42a2.78 2.78 0 0 0 1.95-2A29 29 0 0 0 23 12.25v-2.5A29 29 0 0 0 22.54 6.42ZM10 15.5V8.5l6 3.5Z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 21l1.65-3.9a8 8 0 1 1 3 3L3 21z" />
          <path d="M9 10c.2 1.3 1.7 2.7 3 3l1-1 2 1-1 2c-1.7.3-5.3-2.3-5-5z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 4v9a4 4 0 1 1-4-4" />
          <path d="M14 6a5 5 0 0 0 5 5" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4l16 16" />
          <path d="M20 4 4 20" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case 'site':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" />
        </svg>
      );
    case 'telefone':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.1 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m10 20 6-16" />
          <path d="m6 6 12 6" />
          <path d="m6 12 12 6" />
        </svg>
      );
  }
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
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SiteSettings>({ queryKey: ['admin', 'site-settings'], queryFn: fetchAdminSiteSettings });
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
  const [socialError, setSocialError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showLogoConfirm, setShowLogoConfirm] = useState(false);
  const [socialModal, setSocialModal] = useState<{ open: boolean; value: SocialLink | null }>({ open: false, value: null });
  const [deleteSocial, setDeleteSocial] = useState<SocialLink | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);

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

  const mutation = useMutation({
    mutationFn: (payload: SiteSettings) => updateSiteSettings(payload),
    onSuccess: (payload) => {
      qc.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      setSettings(payload);
    }
  });

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

  const sortedSocials = useMemo(
    () => [...(settings.socials ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [settings.socials]
  );

  const handleReorder = (toId: string) => {
    if (fromIndex === null) return;
    const list = [...sortedSocials];
    const targetIndex = list.findIndex((item) => item.id === toId);
    if (targetIndex === -1 || targetIndex === fromIndex) {
      setDragging(null);
      setFromIndex(null);
      return;
    }
    const [removed] = list.splice(fromIndex, 1);
    list.splice(targetIndex, 0, removed);
    const updated = list.map((item, index) => ({ ...item, order: index }));
    setSettings((prev) => ({ ...prev, socials: updated }));
    setDragging(null);
    setFromIndex(null);
  };

  const openSocialModal = (social?: SocialLink) => {
    setSocialError(null);
    setSocialModal({ open: true, value: social ?? null });
  };

  const closeSocialModal = () => {
    setSocialError(null);
    setSocialModal({ open: false, value: null });
  };

  const applySocial = (value: SocialLink) => {
    setSocialError(null);
    const normalized = normalizeSocialLink(value);
    const list = [...(settings.socials ?? [])];
    const idx = list.findIndex((item) => item.id === value.id);
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.push(normalized);
    }
    const reordered = list
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item, index) => ({ ...item, order: index }));
    setSettings((prev) => ({ ...prev, socials: reordered }));
    closeSocialModal();
  };

  const isValid =
    settings.siteName.trim().length > 1 &&
    (!settings.cnpj || settings.cnpj.replace(/\D/g, '').length === 14) &&
    (!settings.contactEmail || settings.contactEmail.includes('@'));

  const handleSubmit = async () => {
    setSaving(true);
    setLogoError(null);
    try {
      await mutation.mutateAsync({
        ...settings,
        cnpj: settings.cnpj ? settings.cnpj.replace(/\D/g, '') : null,
        contactEmail: settings.contactEmail?.trim() || null,
        socials: sortedSocials
      });
    } finally {
      setSaving(false);
    }
  };

  const modalValue = socialModal.value ?? {
    id: uuid(),
    platform: 'instagram' as SocialLink['platform'],
    label: '',
    url: '',
    order: sortedSocials.length,
    isVisible: true
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
              <div className="admin-grid">
                <div className="admin-drag-list">
                <div className="admin-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Redes sociais</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      Ordene via arrastar e defina visibilidade.
                    </p>
                  </div>
                  <button className="btn btn-primary" type="button" onClick={() => openSocialModal()}>
                    Adicionar rede
                  </button>
                </div>

                {sortedSocials.length === 0 && <div className="admin-empty">Nenhuma rede adicionada ainda.</div>}

                {sortedSocials.map((item, index) => (
                  <div
                    key={item.id}
                    className={`admin-drag-item ${dragging === item.id ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={() => {
                      setDragging(item.id);
                      setFromIndex(index);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleReorder(item.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setFromIndex(null);
                    }}
                  >
                    <div className="admin-drag-handle" aria-label="Mover rede">↕</div>
                    <div className="admin-drag-content" style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SocialIcon platform={item.platform} />
                        <strong style={{ whiteSpace: 'nowrap' }}>{platformLabels[item.platform]}</strong>
                        {item.label && <span className="muted">· {item.label}</span>}
                      </div>
                      <span className="muted" style={{ wordBreak: 'break-word' }}>{item.url}</span>
                    </div>
                    <div className="admin-actions" style={{ gap: '0.35rem', marginLeft: 'auto' }}>
                      <IconButton
                        icon={item.isVisible ? 'eye' : 'eye-off'}
                        label={item.isVisible ? 'Ocultar' : 'Mostrar'}
                        onClick={() => {
                          const next = settings.socials.map((s) =>
                            s.id === item.id ? { ...s, isVisible: !s.isVisible } : s
                          );
                          setSettings((prev) => ({ ...prev, socials: next }));
                        }}
                      />
                      <button className="icon-button" type="button" onClick={() => openSocialModal(item)} aria-label="Editar rede">
                        ✎
                      </button>
                      <button className="icon-button tone-danger" type="button" onClick={() => setDeleteSocial(item)} aria-label="Remover rede">
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              </div>
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

      <Modal
        isOpen={socialModal.open}
        onClose={closeSocialModal}
        title={socialModal.value ? 'Editar rede' : 'Adicionar rede'}
        width={520}
      >
        <div className="admin-grid">
          <label className="form-field">
            Plataforma
            <select
              value={modalValue.platform}
              onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, platform: e.target.value as SocialLink['platform'] } }))}
            >
              {socialPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platformLabels[platform]}
                </option>
              ))}
            </select>
          </label>
          {modalValue.platform === 'custom' && (
            <label className="form-field">
              Nome / Label
              <input
                value={modalValue.label ?? ''}
                onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, label: e.target.value } }))}
                placeholder="Ex.: Portfólio, Blog"
              />
            </label>
          )}
          <label className="form-field">
            URL
            <input
              value={modalValue.url}
              onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, url: e.target.value } }))}
              placeholder="https://"
            />
          </label>
          {/* Visibilidade editável apenas na lista principal */}
        </div>
        <div className="admin-modal-footer">
          <button className="btn btn-outline" type="button" onClick={closeSocialModal}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (!modalValue.url.trim()) {
                setSocialError('URL é obrigatória para a rede');
                return;
              }
              applySocial(modalValue);
            }}
          >
            Salvar rede
          </button>
        </div>
        {socialError && <div className="admin-empty" role="alert">{socialError}</div>}
      </Modal>

      <ConfirmModal
        isOpen={showLogoConfirm}
        onClose={() => setShowLogoConfirm(false)}
        title="Remover logo"
        description="Tem certeza que deseja remover o logo? Essa ação não pode ser desfeita."
        onConfirm={handleLogoRemove}
        confirmLabel="Remover"
      />

      <ConfirmModal
        isOpen={!!deleteSocial}
        onClose={() => setDeleteSocial(null)}
        title="Remover rede social"
        description={`Deseja remover "${deleteSocial?.label || (deleteSocial ? platformLabels[deleteSocial.platform] : '')}"?`}
        onConfirm={() => {
          if (!deleteSocial) return;
          const remaining = (settings.socials ?? []).filter((item) => item.id !== deleteSocial.id);
          setSettings((prev) => ({ ...prev, socials: remaining }));
          setDeleteSocial(null);
        }}
        confirmLabel="Remover"
      />
    </div>
  );
}
