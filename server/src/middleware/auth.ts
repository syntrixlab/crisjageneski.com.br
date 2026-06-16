import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.controller';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next(new HttpError(401, 'Unauthorized'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as Express.UserPayload;
    req.user = payload;
    return next();
  } catch (error) {
    return next(new HttpError(401, 'Invalid token'));
  }
}
