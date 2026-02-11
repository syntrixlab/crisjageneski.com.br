import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    // Log detalhes completos do erro de validação
    console.error('[Zod Validation Error]', JSON.stringify(err.issues, null, 2));
    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        issues: err.flatten()
      }
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      data: null,
      error: {
        message: err.message,
        details: err.details
      }
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(400).json({
        data: null,
        error: {
          message: 'Conflito de ordenação detectado. Tente novamente.',
          details: err.meta
        }
      });
    }
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res.status(500).json({ data: null, error: { message: 'Internal server error' } });
}
