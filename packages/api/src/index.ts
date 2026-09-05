import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { projectsRouter } from './routes/projects';
import { jobsRouter } from './routes/jobs';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// Error handling
interface HttpError extends Error {
  status?: number;
  code?: string;
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Glaszetter Snel API running on port ${PORT}`);
});

export default app;
