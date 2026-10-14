import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { findUserById, login, InvalidCredentialsError } from '../services/authService';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { password } = req.body ?? {};
  const email = req.body?.identifier ?? req.body?.username ?? req.body?.email;

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Gebruikersnaam of e-mail en wachtwoord zijn verplicht' },
    });
    return;
  }

  try {
    const { user, token } = await login(email, password);
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: err.message },
      });
      return;
    }
    next(err);
  }
});

authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await findUserById(req.auth!.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }
);
