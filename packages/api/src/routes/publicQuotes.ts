import { Router, type NextFunction, type Request, type Response } from 'express';
import { NotFoundError } from '../errors';
import {
  approveQuoteByToken,
  getQuoteByPublicToken,
  rejectQuoteByToken,
  QuoteAlreadyDecidedError,
} from '../services/quoteService';
import { getProject } from '../services/projectService';
import { getCustomer } from '../services/customerService';
import { getCompany } from '../services/companyService';
import { generateQuotePdf } from '../services/pdfService';

// This router intentionally has NO requireAuth: the unguessable public_token
// in the URL is the sole access control for these endpoints. It exists so a
// customer can view and approve/reject a quote without an account.
export const publicQuotesRouter = Router();

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
    return;
  }
  if (err instanceof QuoteAlreadyDecidedError) {
    res.status(400).json({
      success: false,
      error: { code: 'QUOTE_ALREADY_DECIDED', message: err.message },
    });
    return;
  }
  next(err);
};

publicQuotesRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quote = await getQuoteByPublicToken(req.params.token);
    const project = await getProject(quote.companyId, quote.projectId);
    const customer = await getCustomer(quote.companyId, project.customerId);
    const company = await getCompany(quote.companyId);
    res.json({ success: true, data: { quote, company, customer } });
  } catch (err) {
    handleError(err, res, next);
  }
});

publicQuotesRouter.get(
  '/:token/pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quote = await getQuoteByPublicToken(req.params.token);
      const project = await getProject(quote.companyId, quote.projectId);
      const customer = await getCustomer(quote.companyId, project.customerId);
      const company = await getCompany(quote.companyId);

      const doc = generateQuotePdf(quote, company, customer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${quote.quoteNumber}.pdf"`);
      doc.pipe(res);
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

publicQuotesRouter.post(
  '/:token/approve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quote = await approveQuoteByToken(req.params.token);
      res.json({ success: true, data: quote });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

publicQuotesRouter.post(
  '/:token/reject',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const quote = await rejectQuoteByToken(req.params.token, reason);
      res.json({ success: true, data: quote });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);
