import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { 
  fetchFormSubmissions, 
  deleteFormSubmission,
  type FormSubmission,
  type FormSubmissionsResponse 
} from '../api/queries';

interface Page {
  id: string;
  title: string;
  slug: string;
}

export function AdminFormSubmissionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPageId, setFilterPageId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const limit = 20;

  // Buscar lista de páginas para o dropdown
  const { data: pages } = useQuery<Page[]>({
    queryKey: ['pages-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/pages', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.pages || [];
    }
  });

  const { data, isLoading, error, refetch } = useQuery<FormSubmissionsResponse>({
    queryKey: ['formSubmissions', currentPage, filterPageId, searchText, startDate, endDate],
    queryFn: () => fetchFormSubmissions({
      pageId: filterPageId || undefined,
      search: searchText || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: currentPage,
      limit
    })
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta resposta?')) {
      return;
    }

    try {
      await deleteFormSubmission(id);
      refetch();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  const handleClearFilters = () => {
    setFilterPageId('');
    setSearchText('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterPageId || searchText || startDate || endDate;

  const normalizePhone = (phone?: string | null) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const normalizeLabel = (label?: string | null) =>
    (label || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();

  const getWhatsAppLink = (phone: string | null, message = 'Ol\u00e1! Vi sua mensagem enviada pelo formul\u00e1rio do site. Posso te ajudar?') => {
    const normalized = normalizePhone(phone || undefined);
    if (!normalized) return null;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  };

  const fallbackFromResolved = (
    submission: FormSubmission,
    labels: string[]
  ): { value: string | null } => {
    const found = submission.resolvedFields?.find((f) => {
      const norm = normalizeLabel(f.label);
      return labels.some((term) => norm.includes(term));
    });
    if (found?.value) return { value: String(found.value).trim() || null };
    return { value: null };
  };

  const deriveLeadInfo = (submission: FormSubmission) => {
    const name =
      submission.leadName?.trim() ||
      fallbackFromResolved(submission, ['nome', 'name']).value ||
      null;

    const message =
      submission.leadMessage?.trim() ||
      fallbackFromResolved(submission, ['mensagem', 'message', 'coment', 'observa', 'descricao', 'descri']).value ||
      null;

    return {
      leadName: name && name.length > 0 ? name : 'Sem nome',
      leadMessage: message
    };
  };

  const derivePhone = (submission: FormSubmission) => {
    const fallbackRaw = fallbackFromResolved(submission, ['telefone', 'whatsapp', 'celular', 'fone', 'phone']).value;
    const phoneNormalized =
      submission.leadPhoneNormalized ||
      normalizePhone(submission.leadPhone || undefined) ||
      normalizePhone(fallbackRaw || undefined);
    return phoneNormalized;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Respostas de Formulários</h1>
        <p className="muted">Visualize e gerencie as respostas enviadas pelos visitantes</p>
      </div>

      <div className="admin-card">
        {/* Filtros */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nome, email, telefone..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Página
            </label>
            <select
              value={filterPageId}
              onChange={(e) => {
                setFilterPageId(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            >
              <option value="">Todas as páginas</option>
              {pages?.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Data inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Data final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            />
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleClearFilters}
                style={{ width: '100%' }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {data && (
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            {data.total > 0 ? (
              <>
                Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, data.total)} de {data.total} respostas
              </>
            ) : (
              'Nenhuma resposta encontrada'
            )}
          </div>
        )}

        {/* Loading/Error States */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #e5e7eb',
              borderTopColor: 'var(--color-clay)',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 0.8s linear infinite'
            }}></div>
            <p>Carregando respostas...</p>
          </div>
        )}
        
        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b'
          }}>
            <p style={{ marginBottom: '1rem' }}>Erro ao carregar respostas</p>
            <button className="btn btn-sm btn-outline" onClick={() => refetch()}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela */}
        {data && data.submissions.length > 0 && (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>Data/Hora</th>
                    <th>Página</th>
                    <th>Lead / Mensagem</th>
                    <th style={{ width: '170px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((submission) => {
                    const phoneNormalized = derivePhone(submission);
                    const waLink = phoneNormalized ? getWhatsAppLink(phoneNormalized) : null;
                    const { leadName, leadMessage } = deriveLeadInfo(submission);
                    return (
                      <tr key={submission.id}>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            {new Date(submission.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(submission.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          {submission.page ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{submission.page.title}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                /p/{submission.page.slug}
                              </div>
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{leadName}</div>
                          <div
                            style={{
                              fontSize: '0.875rem',
                              color: '#4b5563',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '460px',
                              lineHeight: 1.4
                            }}
                            title={leadMessage || undefined}
                          >
                            {leadMessage || 'Sem mensagem'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="admin-actions">
                            <button
                              className="btn btn-sm btn-outline icon-btn"
                              style={{ color: waLink ? '#25d366' : '#9ca3af', borderColor: '#e5e7eb' }}
                              aria-label={waLink ? 'Chamar no WhatsApp' : 'Telefone não informado'}
                              title={waLink ? 'Chamar no WhatsApp' : 'Telefone não informado'}
                              onClick={() => waLink && window.open(waLink, '_blank', 'noopener,noreferrer')}
                              disabled={!waLink}
                            >
                              <FontAwesomeIcon icon={faWhatsapp} />
                            </button>
                            <Link
                              to={`/admin/form-submissions/${submission.id}`}
                              className="btn btn-sm btn-outline icon-btn"
                              style={{ borderColor: '#e5e7eb' }}
                              aria-label="Visualizar resposta"
                              title="Visualizar resposta"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </Link>
                            <button
                              className="btn btn-sm btn-outline icon-btn"
                              style={{ color: '#dc2626', borderColor: '#fecaca' }}
                              onClick={() => handleDelete(submission.id)}
                              aria-label="Excluir resposta"
                              title="Excluir resposta"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {data.totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{ minWidth: '36px' }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={currentPage === data.totalPages}
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {data && data.submissions.length === 0 && !isLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 1rem',
            color: '#6b7280'
          }}>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              style={{ margin: '0 auto 1rem', opacity: 0.3 }}
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>Nenhuma resposta encontrada</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              {hasActiveFilters 
                ? 'Tente ajustar os filtros para encontrar respostas.'
                : 'As respostas de formulários aparecerão aqui.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-outline" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
