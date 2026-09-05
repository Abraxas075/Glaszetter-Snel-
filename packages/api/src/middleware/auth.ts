import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@glaszetter/shared';
import { verifyToken, type JwtPayload } from '../services/authService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

const unauthorized = (res: Response, message: string) => {
  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message },
  });
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
};
