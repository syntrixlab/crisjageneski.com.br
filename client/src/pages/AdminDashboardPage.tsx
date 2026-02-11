import { SeoHead } from '../components/SeoHead';

export function AdminDashboardPage() {
  return (
    <div className="admin-page">
      <SeoHead title="Painel" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Bem-vinda, Cris</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Edite navbar, secoes da home, paginas e artigos.</p>
      </div>
      <div className="admin-grid columns-3">
        {[
          { title: 'Barra de navegação', desc: 'Gerencie itens de navegação', href: '/admin/navbar' },
          { title: 'Página inicial', desc: 'Configure seções e botões de chamada para ação', href: '/admin/home' },
          { title: 'Artigos', desc: 'Publique e edite posts', href: '/admin/articles' },
          { title: 'Imagens', desc: 'Envie e gerencie mídia', href: '/admin/media' }
        ].map((item) => (
          <a key={item.title} className="admin-card link" href={item.href} style={{ display: 'grid', gap: '0.4rem' }}>
            <strong>{item.title}</strong>
            <p style={{ margin: 0, color: 'var(--color-forest)' }}>{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
