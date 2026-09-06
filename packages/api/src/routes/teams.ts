import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { NotFoundError } from '../errors';
import {
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  updateTeam,
  type TeamInput,
} from '../services/teamService';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

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

teamsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await listTeams(req.auth!.companyId);
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
});

teamsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await getTeam(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: team });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

teamsRouter.post(
  '/',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const input = req.body as TeamInput;

    if (typeof input?.name !== 'string' || input.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'name is required' },
      });
      return;
    }

    try {
      const team = await createTeam(req.auth!.companyId, input);
      res.status(201).json({ success: true, data: team });
    } catch (err) {
      handleNotFound(err, res, next);
    }
  }
);

teamsRouter.patch(
  '/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await updateTeam(
        req.auth!.companyId,
        req.params.id,
        req.body as Partial<TeamInput>
      );
      res.json({ success: true, data: team });
    } catch (err) {
      handleNotFound(err, res, next);
    }
  }
);

teamsRouter.delete(
  '/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteTeam(req.auth!.companyId, req.params.id);
      res.status(204).send();
    } catch (err) {
      handleNotFound(err, res, next);
    }
  }
);
