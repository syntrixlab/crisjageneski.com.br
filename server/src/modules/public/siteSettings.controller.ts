import { NextFunction, Request, Response } from 'express';
import { SiteSettingsService } from '../../services/siteSettings.service';
import { sendSuccess } from '../../utils/responses';

const service = new SiteSettingsService();

export async function getPublicSiteSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPublic();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
