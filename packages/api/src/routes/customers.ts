import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { parsePagination } from '../utils/pagination';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  type CustomerInput,
} from '../services/customerService';

export const customersRouter = Router();

customersRouter.use(requireAuth);

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

customersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result = await listCustomers(req.auth!.companyId, pagination);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

customersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await getCustomer(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

customersRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const input = req.body as CustomerInput;

  if (typeof input?.name !== 'string' || input.name.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'name is required' },
    });
    return;
  }

  try {
    const customer = await createCustomer(req.auth!.companyId, input);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

customersRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await updateCustomer(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<CustomerInput>
    );
    res.json({ success: true, data: customer });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

customersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteCustomer(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
