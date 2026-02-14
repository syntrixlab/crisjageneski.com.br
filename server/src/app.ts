import express from 'express';
import cors from 'cors';
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
    origin: '*',
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
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'tiny'));

// Middleware para desabilitar cache em rotas /api
app.use('/api', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

app.use(apiRateLimit);

app.get('/api/health', (_req, res) => sendSuccess(res, { status: 'ok' }));

app.use(routes);

app.use(errorHandler);

export { app };
