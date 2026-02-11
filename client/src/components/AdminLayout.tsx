import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../App.css';

const navSections = [
  {
    label: 'Conteudo',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'grid' },
      { to: '/admin/navbar', label: 'Barra de navegacao', icon: 'menu' },
      { to: '/admin/home', label: 'Pagina inicial', icon: 'home' },
      { to: '/admin/pages', label: 'Paginas', icon: 'pages' },
      { to: '/admin/articles', label: 'Artigos', icon: 'article' },
      { to: '/admin/settings', label: 'Configuracoes do Site', icon: 'settings' }
    ]
  },
  {
    label: 'Formularios',
    items: [{ to: '/admin/form-submissions', label: 'Respostas dos formulários', icon: 'clipboard' }]
  },
  {
    label: 'Midia',
    items: [{ to: '/admin/media', label: 'Imagens', icon: 'image' }]
  }
];

const pageTitles: Record<string, string> = {
  '/admin': 'Painel',
  '/admin/navbar': 'Navbar',
  '/admin/home': 'Home',
  '/admin/pages': 'Paginas',
  '/admin/articles': 'Artigos',
  '/admin/media': 'Midia',
  '/admin/form-submissions': 'Respostas dos Formularios',
  '/admin/settings': 'Configuracoes'
};

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'grid':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case 'menu':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="17" x2="18" y2="17" />
        </svg>
      );
    case 'home':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5a.5.5 0 0 1-.5-.5V15h-4v5.5a.5.5 0 0 1-.5.5H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'pages':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="14" height="16" rx="2" />
          <path d="M8 9h6" />
          <path d="M8 13h6" />
          <path d="M8 17h3" />
        </svg>
      );
    case 'article':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 4h9l3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      );
    case 'image':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.5-3.5L10 19" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14h6" />
          <path d="M9 10h6" />
        </svg>
      );
    case 'logout':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17 15 12 10 7" />
          <path d="M15 12H3" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    default:
      return null;
  }
}

type AdminTopbarProps = {
  title: string;
  siteUrl: string;
};

function AdminTopbar({ title, siteUrl }: AdminTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-crumb">
        <div className="admin-page-label">
          <small>Painel</small>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="admin-actions">
        <a className="btn btn-outline" href={siteUrl} target="_blank" rel="noreferrer">
          Visualizar site
        </a>
      </div>
    </header>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const logout = () => {
    localStorage.removeItem('cris_token');
    navigate('/admin/login');
  };

  const siteUrl =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_APP_SITE_URL ||
    window.location.origin;

  const title = useMemo(() => pageTitles[location.pathname] ?? 'Painel', [location.pathname]);

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo">
            <span className="admin-logo-badge">CJ</span>
            <span>crisjageneski</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Alternar menu">
            <Icon name="menu" />
          </button>
        </div>
        <nav className="admin-nav">
          {navSections.map((section) => (
            <div key={section.label} className="admin-nav-section">
              <span className="admin-nav-label">{section.label}</span>
              <div className="admin-nav-list">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button onClick={logout} className="btn btn-outline admin-logout" style={{ width: '100%' }}>
          <Icon name="logout" /> <span>Sair</span>
        </button>
      </aside>
      <div className="admin-main">
        <AdminTopbar title={title} siteUrl={siteUrl} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
