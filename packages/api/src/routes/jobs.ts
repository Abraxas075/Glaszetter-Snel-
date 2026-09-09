import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { parsePagination } from '../utils/pagination';
import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  updateJob,
  type JobInput,
} from '../services/jobService';

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

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

jobsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const query = req.query as Record<string, unknown>;
    const strParam = (key: string) => (typeof query[key] === 'string' ? (query[key] as string) : undefined);
    const result = await listJobs(req.auth!.companyId, pagination, {
      projectId: strParam('projectId'),
      teamId: strParam('teamId'),
      scheduledFrom: strParam('scheduledFrom'),
      scheduledTo: strParam('scheduledTo'),
      mine: query.mine === 'true',
      userId: req.auth!.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await getJob(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: job });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

jobsRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const input = req.body as JobInput;

  if (typeof input?.name !== 'string' || input.name.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'name is required' },
    });
    return;
  }

  if (typeof input?.projectId !== 'string' || input.projectId.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'projectId is required' },
    });
    return;
  }

  try {
    const job = await createJob(req.auth!.companyId, input);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

jobsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await updateJob(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<JobInput>
    );
    res.json({ success: true, data: job });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

jobsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteJob(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
