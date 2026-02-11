import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(process.env.PORT ? parseInt(process.env.PORT) : 4000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/cris_site'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_STORAGE_BUCKET: z.string().default('site-media'),
  REDIS_URL: z.string().optional(),
  REDIS_PREFIX: z.string().default('cris-site'),
  CACHE_TTL_NAV: z.coerce.number().default(3600),
  CACHE_TTL_HOME: z.coerce.number().default(3600),
  CACHE_TTL_PAGE: z.coerce.number().default(600),
  CACHE_TTL_POST: z.coerce.number().default(600),
  CACHE_TTL_POSTS_LIST: z.coerce.number().default(600),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  ALLOWED_IMAGE_MIME_TYPES: z.string().default('image/jpeg,image/png,image/webp')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
