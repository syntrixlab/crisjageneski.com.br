import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { 
  fetchFormSubmission, 
  deleteFormSubmission,
  type FormSubmission 
} from '../api/queries';
import { fetchPage } from '../api/queries';
import { ensureLayoutV2 } from '../utils/pageLayoutHelpers';
import type { PageLayoutV2 } from '../types';

export function AdminFormSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<FormSubmission>({
    queryKey: ['formSubmission', id],
    queryFn: () => {
      if (!id) throw new Error('NOT_FOUND');
      return fetchFormSubmission(id);
    },
    enabled: !!id,
    retry: false
  });

  const { data: pageDetail } = useQuery({
    queryKey: ['page', data?.page?.slug],
    queryFn: () => fetchPage(data?.page?.slug || ''),
    enabled: !!data?.page?.slug
  });

  const fieldLabelMap = (() => {
    if (!pageDetail?.layout || !data?.formBlockId) return {};
    const layout = ensureLayoutV2(pageDetail.layout) as PageLayoutV2;
    for (const section of layout.sections) {
      for (const col of section.cols) {
        for (const block of col.blocks) {
          if (block.type === 'form' && block.id === data.formBlockId) {
            const map: Record<string, { label: string; type?: string }> = {};
            (block.data as any).fields?.forEach((f: any) => {
              if (f?.id) map[f.id] = { label: f.label || '', type: f.type };
            });
            return map;
          }
        }
      }
    }
    return {};
  })();

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta resposta?')) {
      return;
    }

    try {
      if (!id) return;
      await deleteFormSubmission(id);
      navigate('/admin/form-submissions');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-page">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e5e7eb',
            borderTopColor: 'var(--color-clay)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280' }}>Carregando resposta...</p>
        </div>
      </div>
    );
  }

  // Error/Not Found state
  if (error || !data) {
    const isNotFound = error && error.message === 'NOT_FOUND';
    
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1>{isNotFound ? 'Resposta não encontrada' : 'Erro'}</h1>
        </div>
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
            style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#dc2626' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {isNotFound 
              ? 'Esta resposta não existe ou foi removida.'
              : 'Ocorreu um erro ao carregar a resposta.'}
          </p>
          <Link to="/admin/form-submissions" className="btn btn-outline">
            ← Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  // Renderizar valor com formatação apropriada
  const renderValue = (value: any): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span>{value ? 'Sim' : 'Não'}</span>;
    }
    
    if (typeof value === 'string') {
      // Detectar textarea (texto com múltiplas linhas)
      if (value.includes('\n')) {
        return (
          <pre style={{ 
            background: '#f9fafb',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            maxHeight: '200px',
            overflowY: 'auto',
            margin: '0.5rem 0 0 0'
          }}>
            {value}
          </pre>
        );
      }
      return <span>{value}</span>;
    }
    
    if (Array.isArray(value)) {
      return <span>{value.join(', ')}</span>;
    }
    
    if (typeof value === 'object') {
      return (
        <pre style={{ 
          background: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          fontSize: '0.85rem',
          margin: '0.5rem 0 0 0',
          overflowX: 'auto'
        }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  const formatFieldLabel = (key: string): string => {
    const snap = fieldLabelMap[key];
    if (snap?.label && snap.label.trim()) return snap.label;
    const fallback = key.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return fallback || `Campo (${key.substring(0, 6)}...)`;
  };

  const formattedDate = new Date(data.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="admin-page">
      {/* Header com breadcrumb e ações */}
      <div className="admin-page-header">
        <div>
          <Link 
            to="/admin/form-submissions" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--color-clay)',
              marginBottom: '0.75rem',
              textDecoration: 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Voltar para respostas dos formulários
          </Link>
          <h1 style={{ marginBottom: '0.5rem' }}>Detalhes da Resposta</h1>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formattedDate}
            </div>
            {data.page && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
                {data.page.title}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copiado!' : 'Copiar JSON'}
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={handleDelete} 
            style={{ color: '#dc2626' }}
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Resumo (se existir) */}
      {data.summary && (
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            marginBottom: '0.75rem',
            color: 'var(--color-deep)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Resumo
          </h2>
          <p style={{
            padding: '1rem',
            background: 'linear-gradient(145deg, #f0f9ff, #e0f2fe)',
            borderRadius: '8px',
            border: '1px solid #bae6fd',
            color: '#0c4a6e',
            lineHeight: '1.6'
          }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* Dados do Formulário */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-deep)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14h6" />
            <path d="M9 10h6" />
          </svg>
          Dados do Formulário
        </h2>

        {Object.entries(data.data).length > 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem' 
          }}>
            {Object.entries(data.data).map(([key, value]) => (
              <div 
                key={key}
                style={{
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <div style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  {formatFieldLabel(key)}
                </div>
                <div style={{ 
                  fontSize: '0.95rem',
                  color: '#1f2937',
                  lineHeight: '1.6'
                }}>
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Nenhum dado registrado
          </div>
        )}
      </div>

      {/* Metadados Técnicos */}
      <div className="admin-card">
        <h2 style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-deep)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.25M15.54 15.54l4.24 4.25M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
          </svg>
          Metadados Técnicos
        </h2>
        <div style={{ 
          display: 'grid', 
          gap: '1rem',
          background: '#f9fafb',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'start' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>ID da Resposta:</span>
            <code style={{ 
              fontSize: '0.8rem', 
              background: '#fff',
              color: '#374151',
              padding: '0.375rem 0.625rem', 
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {data.id}
            </code>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'start' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>ID do Bloco:</span>
            <code style={{ 
              fontSize: '0.8rem', 
              background: '#fff',
              color: '#374151',
              padding: '0.375rem 0.625rem', 
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {data.formBlockId}
            </code>
          </div>

          {data.page && (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Link da Página:</span>
              <Link 
                to={`/p/${data.page.slug}`} 
                target="_blank"
                style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--color-clay)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                /p/{data.page.slug}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>
          )}
          
          {data.ip && (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Endereço IP:</span>
              <span style={{ fontSize: '0.875rem' }}>{data.ip}</span>
            </div>
          )}
          
          {data.userAgent && (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'start' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>User Agent:</span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280',
                wordBreak: 'break-all',
                lineHeight: '1.5',
                fontFamily: 'monospace'
              }}>
                {data.userAgent}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
