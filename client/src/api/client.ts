import axios from 'axios';

const apiUrlFromEnv = import.meta.env.VITE_API_URL?.trim();

// Permite configurar API absoluta em VPS/CDN quando necessario.
// Sem configuracao, mantem /api relativo ao mesmo dominio.
export const API_BASE = apiUrlFromEnv || '/api';
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

export const AUTH_FLAG_KEY = 'admin_authed';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Interceptor de resposta para tratamento global de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Nao autenticado - redirecionar para login
    if (error.response?.status === 401 && !window.location.pathname.includes('/admin/login')) {
      localStorage.removeItem(AUTH_FLAG_KEY);
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

    // 400/422: Erro de validacao - passar mensagem detalhada do servidor
    if (error.response?.status === 400 || error.response?.status === 422) {
      const data = error.response?.data;
      const errObj = data?.error ?? {};
      let message: string = errObj.message || data?.message || 'Dados invalidos.';
      // Quando o servidor envia issues de validação (Zod), detalhar campo a campo.
      const issues = errObj.issues;
      if (issues) {
        const details = [
          ...(issues.formErrors ?? []),
          ...Object.values((issues.fieldErrors ?? {}) as Record<string, string[]>).flat()
        ].filter(Boolean) as string[];
        if (details.length) {
          message = details.join(' • ');
        }
      }
      console.error('Validation error details:', data);
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
