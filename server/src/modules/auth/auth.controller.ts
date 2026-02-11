import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/responses';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}
