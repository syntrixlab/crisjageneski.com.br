import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export function EditorDrawer({
  isOpen,
  onClose,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {isOpen && (
        <div
          className="editor-drawer-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
        />
      )}

      <div
        className="editor-drawer"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '320px',
          background: '#fff',
          boxShadow: isOpen ? '0 0 24px rgba(0, 0, 0, 0.15)' : 'none',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms ease, box-shadow 280ms ease',
          zIndex: 1000,
          overflow: 'auto',
          borderLeft: '1px solid #e1e5eb'
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              transition: 'background 150ms ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f2f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            aria-label="Fechar painel"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
          {children}
        </div>
      </div>
    </>
  );
}
