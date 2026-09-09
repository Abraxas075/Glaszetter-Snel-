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
    if (typeof input?.email !== 'string' || input.email.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'email is required' },
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
