import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { getCompany, updateCompany, type CompanyInput } from '../services/companyService';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

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

companiesRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await getCompany(req.auth!.companyId);
    res.json({ success: true, data: company });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

companiesRouter.patch(
  '/me',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const company = await updateCompany(req.auth!.companyId, req.body as CompanyInput);
      res.json({ success: true, data: company });
    } catch (err) {
      handleNotFound(err, res, next);
    }
  }
);
