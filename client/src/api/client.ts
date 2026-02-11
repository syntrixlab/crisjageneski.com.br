import axios from 'axios';

// Em producao (build), usa /api (relativo ao mesmo dominio).
// Em desenvolvimento, usa VITE_API_URL do .env (fallback para /api).
export const API_BASE = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || '/api');
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cris_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta para tratamento global de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Nao autenticado - redirecionar para login
    if (error.response?.status === 401 && !window.location.pathname.includes('/admin/login')) {
      localStorage.removeItem('cris_token');
      window.location.href = '/admin/login';
      return Promise.reject(new Error('Sessao expirada. Faca login novamente.'));
    }

    // 403: Sem permissao
    if (error.response?.status === 403) {
      return Promise.reject(new Error('Voce nao tem permissao para esta acao.'));
    }

    // 404: Nao encontrado
    if (error.response?.status === 404) {
      return Promise.reject(new Error('NOT_FOUND'));
    }

    // 400/422: Erro de validacao - passar mensagem do servidor
    if (error.response?.status === 400 || error.response?.status === 422) {
      const message = error.response?.data?.message || 'Dados invalidos.';
      console.error('Validation error details:', error.response?.data);
      return Promise.reject(new Error(message));
    }

    // 500+: Erro do servidor
    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Erro no servidor. Tente novamente mais tarde.'));
    }

    // Erro de rede ou timeout
    if (!error.response) {
      return Promise.reject(new Error('Erro de conexao. Verifique sua internet.'));
    }

    return Promise.reject(error);
  }
);
