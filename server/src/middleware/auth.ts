import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new HttpError(401, 'Unauthorized'));
  }

  const [, token] = header.split(' ');
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
