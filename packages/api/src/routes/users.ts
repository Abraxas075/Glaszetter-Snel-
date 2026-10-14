import { createEmployeeBatch, EmployeeConflictError, validateEmployees } from '../services/employeeBatch';
import { normalizeUsername } from '../services/username';
import { Router, type NextFunction, type Request, type Response } from 'express';
import type { UserRole } from '@glaszetter/shared';
import { requireAuth, requireRole } from '../middleware/auth';
import { createUser, listUsers, EmailInUseError, type CreateUserInput } from '../services/userService';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await listUsers(req.auth!.companyId);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

usersRouter.post(
  '/',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const input = req.body as CreateUserInput;
    const validRoles: UserRole[] = [
      'owner',
      'planner',
      'inmeter',
      'glaszetter',
      'warehouse',
      'admin',
      'external',
    ];

    if (typeof input?.name !== 'string' || input.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'name is required' },
      });
      return;
    }
    if ((!input?.email && !input?.username) || (input.username !== undefined && !normalizeUsername(input.username)) || (input.email !== undefined && (typeof input.email !== 'string' || (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))))) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Vul een e-mailadres of geldige gebruikersnaam in (3–40 tekens: letters, cijfers, punt, streepje of underscore; begin met een letter)' },
      });
      return;
    }
    if (typeof input?.password !== 'string' || input.password.length < 8) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'password must be at least 8 characters' },
      });
      return;
    }
    if (!validRoles.includes(input?.role)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'a valid role is required' },
      });
      return;
    }

    try {
      const user = await createUser(req.auth!.companyId, input);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      if (err instanceof EmailInUseError) {
        res.status(400).json({
          success: false,
          error: { code: 'EMAIL_IN_USE', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

usersRouter.post('/employee-batch', requireRole('owner', 'admin'), async (req, res, next) => {
  if (!validateEmployees(req.body?.employees)) { res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Controleer de medewerker-namen en unieke gebruikersnamen.' } }); return; }
  try {
    const accounts = await createEmployeeBatch(req.auth!.companyId, req.body.employees);
    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({ success: true, data: accounts });
  } catch (error) {
    if (error instanceof EmployeeConflictError || (error && typeof error === 'object' && 'code' in error && error.code === '23505')) {
      res.status(409).json({ success: false, error: { code: 'ACCOUNT_CONFLICT', message: error instanceof EmployeeConflictError ? error.message : 'Een gebruikersnaam is inmiddels in gebruik. Er zijn geen accounts uit deze aanvraag toegevoegd.' } }); return;
    }
    next(error);
  }
});
