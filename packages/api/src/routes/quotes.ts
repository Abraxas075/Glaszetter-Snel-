import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import {
  addQuoteLine,
  convertQuoteToInvoice,
  createQuote,
  deleteQuote,
  deleteQuoteLine,
  getQuote,
  listQuotes,
  updateQuote,
  QuoteNotApprovedError,
  type QuoteInput,
  type QuoteLineInput,
} from '../services/quoteService';
import { getProject } from '../services/projectService';
import { getCustomer } from '../services/customerService';
import { getCompany } from '../services/companyService';
import { generateQuotePdf } from '../services/pdfService';

export const quotesRouter = Router();

quotesRouter.use(requireAuth);

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
    return;
  }
  if (err instanceof QuoteNotApprovedError) {
    res.status(400).json({
      success: false,
      error: { code: 'QUOTE_NOT_APPROVED', message: err.message },
    });
    return;
  }
  next(err);
};

quotesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const quotes = await listQuotes(req.auth!.companyId, { jobId });
    res.json({ success: true, data: quotes });
  } catch (err) {
    next(err);
  }
});

quotesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quote = await getQuote(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: quote });
  } catch (err) {
    handleError(err, res, next);
  }
});

quotesRouter.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.auth!.companyId;
    const quote = await getQuote(companyId, req.params.id);
    const project = await getProject(companyId, quote.projectId);
    const customer = await getCustomer(companyId, project.customerId);
    const company = await getCompany(companyId);

    const doc = generateQuotePdf(quote, company, customer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quote.quoteNumber}.pdf"`);
    doc.pipe(res);
  } catch (err) {
    handleError(err, res, next);
  }
});

quotesRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const input = req.body as QuoteInput;

  if (typeof input?.jobId !== 'string' || input.jobId.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'jobId is required' },
    });
    return;
  }

  try {
    const quote = await createQuote(req.auth!.companyId, input);
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    handleError(err, res, next);
  }
});

quotesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quote = await updateQuote(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<QuoteInput>
    );
    res.json({ success: true, data: quote });
  } catch (err) {
    handleError(err, res, next);
  }
});

quotesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteQuote(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
});

quotesRouter.post(
  '/:id/lines',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const input = req.body as QuoteLineInput;

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
      const line = await addQuoteLine(req.auth!.companyId, req.params.id, input);
      res.status(201).json({ success: true, data: line });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

quotesRouter.delete(
  '/:id/lines/:lineId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteQuoteLine(req.auth!.companyId, req.params.id, req.params.lineId);
      res.status(204).send();
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

quotesRouter.post(
  '/:id/convert-to-invoice',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await convertQuoteToInvoice(req.auth!.companyId, req.params.id);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);
