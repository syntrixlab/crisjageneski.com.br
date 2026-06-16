import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { ConfirmModal, IconButton, Modal } from './AdminUI';
import type { SocialLink } from '../types';

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

type SocialLinksEditorProps = {
  socials: SocialLink[];
  onChange: (socials: SocialLink[]) => void;
};

export function SocialLinksEditor({ socials, onChange }: SocialLinksEditorProps) {
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialModal, setSocialModal] = useState<{ open: boolean; value: SocialLink | null }>({ open: false, value: null });
  const [deleteSocial, setDeleteSocial] = useState<SocialLink | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);

  const sortedSocials = useMemo(
    () => [...(socials ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [socials]
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
    onChange(updated);
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
    const list = [...(socials ?? [])];
    const idx = list.findIndex((item) => item.id === value.id);
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.push(normalized);
    }
    const reordered = list
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item, index) => ({ ...item, order: index }));
    onChange(reordered);
    closeSocialModal();
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
    <>
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
                      const next = socials.map((s) =>
                        s.id === item.id ? { ...s, isVisible: !s.isVisible } : s
                      );
                      onChange(next);
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
        isOpen={!!deleteSocial}
        onClose={() => setDeleteSocial(null)}
        title="Remover rede social"
        description={`Deseja remover "${deleteSocial?.label || (deleteSocial ? platformLabels[deleteSocial.platform] : '')}"?`}
        onConfirm={() => {
          if (!deleteSocial) return;
          const remaining = (socials ?? []).filter((item) => item.id !== deleteSocial.id);
          onChange(remaining);
          setDeleteSocial(null);
        }}
        confirmLabel="Remover"
      />
    </>
  );
}
