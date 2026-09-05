import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { parsePagination } from '../utils/pagination';
import {
  createElementWithMeasurement,
  deleteElement,
  getElement,
  listElements,
  suggestNextCode,
  updateElement,
  type ElementInput,
  type MeasurementInput,
} from '../services/elementService';

export const elementsRouter = Router();

elementsRouter.use(requireAuth);

const handleNotFound = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
    return;
  }
  next(err);
};

elementsRouter.get('/next-code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const jobId = req.query.jobId;
  const prefix = req.query.prefix;

  if (typeof jobId !== 'string' || typeof prefix !== 'string' || prefix.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'jobId and prefix query params are required' },
    });
    return;
  }

  try {
    const code = await suggestNextCode(req.auth!.companyId, jobId, prefix.toUpperCase());
    res.json({ success: true, data: { code } });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

elementsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const result = await listElements(req.auth!.companyId, pagination, { jobId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

elementsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const element = await getElement(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: element });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

interface CreateElementBody extends ElementInput {
  width: number;
  height: number;
  glassType?: string;
  measurementNotes?: string;
  status?: MeasurementInput['status'];
}

elementsRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as Partial<CreateElementBody>;

  if (typeof body?.jobId !== 'string' || body.jobId.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'jobId is required' },
    });
    return;
  }
  if (typeof body?.code !== 'string' || body.code.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'code is required' },
    });
    return;
  }
  if (typeof body?.type !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'type is required' },
    });
    return;
  }
  if (typeof body?.width !== 'number' || typeof body?.height !== 'number') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'width and height (numbers) are required' },
    });
    return;
  }

  try {
    const { element, measurement } = await createElementWithMeasurement(
      req.auth!.companyId,
      {
        jobId: body.jobId,
        code: body.code,
        type: body.type,
        location: body.location,
        notes: body.notes,
      },
      {
        width: body.width,
        height: body.height,
        glassType: body.glassType,
        notes: body.measurementNotes,
        status: body.status,
      }
    );
    res.status(201).json({ success: true, data: { element, measurement } });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

elementsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const element = await updateElement(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<Omit<ElementInput, 'jobId'>>
    );
    res.json({ success: true, data: element });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

elementsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteElement(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
