import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import ReactDOM from 'react-dom';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ToastStatus = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  status: ToastStatus;
  title: string;
  message?: string;
  code?: string;
  duration?: number; // ms; 0 = não fecha sozinho
}

type ToastInput = Omit<ToastItem, 'id'>;

interface ToastContextValue {
  add: (toast: ToastInput) => void;
  remove: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

// ─── Helpers exportados (sem hook) ───────────────────────────────────────────
// Permitem chamar toasts de fora de componentes React (ex: em utils, mutations)

let _add: ((toast: ToastInput) => void) | null = null;

export const toast = {
  success: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'success', title, ...opts }),

  error: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'error', title, duration: 0, ...opts }),

  warning: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'warning', title, duration: 8000, ...opts }),

  info: (title: string, opts?: { message?: string; code?: string; duration?: number }) =>
    _add?.({ status: 'info', title, ...opts }),
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((toast: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  // Registrar o add global
  useEffect(() => {
    _add = add;
    return () => { _add = null; };
  }, [add]);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <Toaster toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

// ─── Toaster (container) ─────────────────────────────────────────────────────

function Toaster({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div className="toast-container" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// ─── Card individual ─────────────────────────────────────────────────────────

const STATUS_META: Record<ToastStatus, { label: string; icon: string }> = {
  success: { label: 'SUCESSO',  icon: '✓' },
  error:   { label: 'ERRO',     icon: '✕' },
  warning: { label: 'ATENÇÃO',  icon: '!' },
  info:    { label: 'INFO',     icon: 'i' },
};

const DEFAULT_DURATION: Record<ToastStatus, number> = {
  success: 4000,
  error:   0,      // erros ficam até o usuário fechar
  warning: 8000,
  info:    5000,
};

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = toast.duration !== undefined ? toast.duration : DEFAULT_DURATION[toast.status];
  const meta = STATUS_META[toast.status];

  // Entrada com pequeno delay para o CSS de fade-in funcionar
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Auto-fechar
  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(() => handleClose(), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 280);
  };

  const handleCopyCode = () => {
    if (!toast.code) return;
    navigator.clipboard.writeText(toast.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  return (
    <div
      className={`toast-card toast-card--${toast.status} ${visible ? 'toast-card--visible' : ''}`}
      role="alert"
    >
      {/* Ícone + status */}
      <div className="toast-header">
        <span className="toast-icon" aria-hidden="true">{meta.icon}</span>
        <span className="toast-status">{meta.label}</span>
        <button
          className="toast-close"
          onClick={handleClose}
          aria-label="Fechar notificação"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Título */}
      <p className="toast-title">{toast.title}</p>

      {/* Mensagem adicional */}
      {toast.message && (
        <p className="toast-message">{toast.message}</p>
      )}

      {/* Código de erro rastreável */}
      {toast.code && (
        <button
          className="toast-code"
          onClick={handleCopyCode}
          title="Clique para copiar o código de erro"
          type="button"
        >
          <span className="toast-code-label">Código:</span>
          <code>{toast.code}</code>
          <span className="toast-code-copy">{codeCopied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      )}
    </div>
  );
}
