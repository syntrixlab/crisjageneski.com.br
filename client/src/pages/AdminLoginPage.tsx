import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/queries';
import { AUTH_FLAG_KEY } from '../api/client';
import { SeoHead } from '../components/SeoHead';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      localStorage.setItem(AUTH_FLAG_KEY, '1');
      navigate('/admin');
    } catch (err) {
      setError('Credenciais invalidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 0', maxWidth: '520px' }}>
      <SeoHead title="Login do painel" />
      <div className="admin-card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Entrar</h1>
          <p style={{ margin: 0, color: 'var(--color-forest)' }}>Acesse o painel administrativo.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          {error && <span style={{ color: 'var(--color-burnt)' }}>{error}</span>}
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
