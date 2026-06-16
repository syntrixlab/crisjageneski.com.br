import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/responses';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const SESSION_COOKIE_NAME = 'cris_session';

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 2 * 60 * 60 * 1000, // 2h, matches the JWT expiry in auth.service.ts
  path: '/'
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions);
    return sendSuccess(res, { user: result.user });
  } catch (error) {
    return next(error);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return sendSuccess(res, { ok: true });
}
