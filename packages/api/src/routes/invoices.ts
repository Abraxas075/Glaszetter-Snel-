import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import {
  addInvoiceLine,
  createInvoice,
  deleteInvoice,
  deleteInvoiceLine,
  getInvoice,
  listInvoices,
  updateInvoice,
  type InvoiceInput,
  type InvoiceLineInput,
} from '../services/invoiceService';
import { getProject } from '../services/projectService';
import { getCustomer } from '../services/customerService';
import { getCompany } from '../services/companyService';
import { generateInvoicePdf } from '../services/pdfService';

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
    return;
  }
  next(err);
};

invoicesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const invoices = await listInvoices(req.auth!.companyId, { jobId });
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await getInvoice(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: invoice });
  } catch (err) {
    handleError(err, res, next);
  }
});

invoicesRouter.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.auth!.companyId;
    const invoice = await getInvoice(companyId, req.params.id);
    const project = await getProject(companyId, invoice.projectId);
    const customer = await getCustomer(companyId, project.customerId);
    const company = await getCompany(companyId);

    const doc = generateInvoicePdf(invoice, company, customer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);
  } catch (err) {
    handleError(err, res, next);
  }
});

invoicesRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const input = req.body as InvoiceInput;

    if (typeof input?.jobId !== 'string' || input.jobId.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'jobId is required' },
      });
      return;
    }

    try {
      const invoice = await createInvoice(req.auth!.companyId, input);
      res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

invoicesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await updateInvoice(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<InvoiceInput>
    );
    res.json({ success: true, data: invoice });
  } catch (err) {
    handleError(err, res, next);
  }
});

invoicesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteInvoice(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
});

invoicesRouter.post(
  '/:id/lines',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const input = req.body as InvoiceLineInput;

    if (typeof input?.description !== 'string' || input.description.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'description is required' },
      });
      return;
    }
    if (typeof input?.unitPrice !== 'number') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'unitPrice is required' },
      });
      return;
    }

    try {
      const line = await addInvoiceLine(req.auth!.companyId, req.params.id, input);
      res.status(201).json({ success: true, data: line });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

invoicesRouter.delete(
  '/:id/lines/:lineId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteInvoiceLine(req.auth!.companyId, req.params.id, req.params.lineId);
      res.status(204).send();
    } catch (err) {
      handleError(err, res, next);
    }
  }
);
