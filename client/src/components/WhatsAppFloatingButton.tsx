import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import type { SiteSettings } from '../types';

export function WhatsAppFloatingButton({ settings }: { settings?: SiteSettings }) {
  const enabled = settings?.whatsappEnabled;
  const link = settings?.whatsappLink;
  const position = settings?.whatsappPosition === 'left' ? 'left' : 'right';

  const targetHref = useMemo(() => {
    if (!link) return null;
    const raw = link.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }, [link]);

  if (!enabled || !targetHref) return null;

  return (
    <button
      type="button"
      className={`whatsapp-fab whatsapp-fab--${position}`}
      aria-label="Falar no WhatsApp"
      onClick={() => window.open(targetHref, '_blank', 'noopener,noreferrer')}
      title="Falar no WhatsApp"
    >
      <FontAwesomeIcon icon={faWhatsapp} size="lg" />
    </button>
  );
}
