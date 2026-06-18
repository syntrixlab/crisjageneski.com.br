import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { routes } from './routes';
import { errorHandler } from './middleware/error';
import { apiRateLimit } from './middleware/rateLimit';
import { env } from './config/env';
import { sendSuccess } from './utils/responses';

const app = express();
const supabaseOrigin = new URL(env.SUPABASE_URL).origin;
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();

// Desabilitar ETag para evitar 304 Not Modified
app.disable('etag');

// Necessario em ambientes atras de proxy (EasyPanel/NGINX/Traefik)
// para IP correto em rate limit e logs.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...cspDirectives,
        'img-src': ["'self'", 'data:', 'blob:', supabaseOrigin]
      }
    }
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'tiny'));

// Rotas admin: sem cache (comportamento atual)
app.use('/api/admin', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Rotas de autenticação: sem cache
app.use('/api/login', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});
app.use('/api/logout', (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store' });
  next();
});

// Rotas públicas com dados estáveis: cache de 60s no browser
// (o servidor já usa Redis/memory cache interno; o browser cache é adicional)
app.use('/api/public', (_req, res, next) => {
  // Permite cache de 60s no browser mas revalida
  res.set({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' });
  next();
});

app.use(apiRateLimit);

app.get('/api/health', (_req, res) => sendSuccess(res, { status: 'ok' }));

app.use(routes);

app.use(errorHandler);

export { app };
