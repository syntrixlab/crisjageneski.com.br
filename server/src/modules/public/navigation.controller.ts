import { NextFunction, Request, Response } from 'express';
import { NavigationService } from '../../services/navigation.service';
import { sendSuccess } from '../../utils/responses';

const service = new NavigationService();

export async function getNavigation(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPublic();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
