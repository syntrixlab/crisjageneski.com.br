import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { NavigationService } from '../../services/navigation.service';
import { sendSuccess } from '../../utils/responses';

const service = new NavigationService();

const baseFields = {
  label: z.string().min(2),
  type: z.enum(['INTERNAL_PAGE', 'EXTERNAL_URL']),
  pageKey: z.string().min(1).optional().nullable(),
  url: z.string().min(1).optional().nullable(),
  showInNavbar: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  isParent: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable(),
  orderNavbar: z.coerce.number().int().nonnegative().optional().nullable(),
  orderFooter: z.coerce.number().int().nonnegative().optional().nullable(),
  isVisible: z.boolean().optional()
};

const createSchema = z.object(baseFields).superRefine((data, ctx) => {
  if (data.type === 'INTERNAL_PAGE' && !data.pageKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe pageKey para paginas internas', path: ['pageKey'] });
  }
  if (data.type === 'EXTERNAL_URL' && !data.url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe url para links externos', path: ['url'] });
  }
  if (data.isParent && data.parentId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Itens pai precisam ficar no nível raiz', path: ['parentId'] });
  }
});

const updateSchema = z
  .object({
    ...Object.fromEntries(Object.entries(baseFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]))
  })
  .superRefine((data, ctx) => {
    if (data.type === 'INTERNAL_PAGE' && !data.pageKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe pageKey para paginas internas', path: ['pageKey'] });
    }
    if (data.type === 'EXTERNAL_URL' && !data.url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe url para links externos', path: ['url'] });
    }
    if (data.isParent && data.parentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Itens pai precisam ficar no nível raiz', path: ['parentId'] });
    }
  });

const reorderSchema = z.object({
  context: z.enum(['navbar', 'footer']),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().nullable().optional(),
        order: z.coerce.number().int().nonnegative()
      })
    )
    .min(1)
});

export async function listNav(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listAdmin();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function createNav(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = createSchema.parse(req.body);
    const data = await service.create(payload);
    return sendSuccess(res, data, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateNav(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = updateSchema.parse(req.body);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const data = await service.update(id, payload);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function deleteNav(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await service.delete(id);
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

export async function reorderNav(req: Request, res: Response, next: NextFunction) {
  try {
    // Log payload to help diagnose reorder issues
    // eslint-disable-next-line no-console
    console.log('[NAV][reorder] payload', JSON.stringify(req.body));
    const payload = reorderSchema.parse(req.body);
    const data = await service.reorder(payload.context, payload.items);
    return sendSuccess(res, data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[NAV][reorder] error', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return next(error);
  }
}
