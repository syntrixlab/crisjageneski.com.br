import { NextFunction, Request, Response } from 'express';
import { HomeService } from '../../services/home.service';
import { sendSuccess } from '../../utils/responses';

const service = new HomeService();

export async function getHome(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPublic();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
