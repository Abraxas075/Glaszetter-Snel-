import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { parsePagination } from '../utils/pagination';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type ProjectInput,
} from '../services/projectService';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

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

projectsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await listProjects(req.auth!.companyId, pagination);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getProject(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: project });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

projectsRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const input = req.body as ProjectInput;

  if (typeof input?.name !== 'string' || input.name.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'name is required' },
    });
    return;
  }

  if (typeof input?.customerId !== 'string' || input.customerId.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'customerId is required' },
    });
    return;
  }

  try {
    const project = await createProject(req.auth!.companyId, input);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

projectsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await updateProject(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<ProjectInput>
    );
    res.json({ success: true, data: project });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

projectsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteProject(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
