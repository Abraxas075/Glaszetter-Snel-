import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestBodies, bodyError } from './middleware/requestBodies';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { projectsRouter } from './routes/projects';
import { jobsRouter } from './routes/jobs';
import { elementsRouter } from './routes/elements';
import { measurementsRouter } from './routes/measurements';
import { photosRouter } from './routes/photos';
import { usersRouter } from './routes/users';
import { teamsRouter } from './routes/teams';
import { companiesRouter } from './routes/companies';
import { quotesRouter } from './routes/quotes';
import { invoicesRouter } from './routes/invoices';
import { publicQuotesRouter } from './routes/publicQuotes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors(process.env.APP_ENV === 'test' ? { origin: process.env.CORS_ORIGIN || false } : undefined));
app.use(requestBodies);


// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({ message: 'Glaszetter Snel API v1', phase: 'initialization' });
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/elements', elementsRouter);
app.use('/api/v1/measurements', measurementsRouter);
app.use('/api/v1/photos', photosRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/teams', teamsRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/quotes', quotesRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/public/quotes', publicQuotesRouter);

// Error handling
interface HttpError extends Error {
  status?: number;
  type?: string;
  code?: string;
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  const body = bodyError(err);
  if (body) { res.status(body.status).json({ success: false, error: body.error }); return; }
  if (!err.status || err.status >= 500) console.error(err.message);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

export default app;
