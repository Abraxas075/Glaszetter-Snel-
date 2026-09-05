import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { parsePagination } from '../utils/pagination';
import {
  deleteMeasurement,
  getMeasurement,
  listMeasurements,
  updateMeasurement,
} from '../services/measurementService';
import type { MeasurementInput } from '../services/elementService';
import { parseVoiceTranscript } from '../services/voiceParseService';

export const measurementsRouter = Router();

measurementsRouter.use(requireAuth);

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

measurementsRouter.post(
  '/parse-voice',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const transcript = req.body?.transcript;

    if (typeof transcript !== 'string' || transcript.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'transcript is required' },
      });
      return;
    }

    try {
      const parsed = await parseVoiceTranscript(transcript);
      res.json({ success: true, data: parsed });
    } catch (err) {
      next(err);
    }
  }
);

measurementsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const elementId = typeof req.query.elementId === 'string' ? req.query.elementId : undefined;
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const result = await listMeasurements(req.auth!.companyId, pagination, { elementId, jobId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

measurementsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const measurement = await getMeasurement(req.auth!.companyId, req.params.id);
    res.json({ success: true, data: measurement });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

measurementsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const measurement = await updateMeasurement(
      req.auth!.companyId,
      req.params.id,
      req.body as Partial<MeasurementInput>
    );
    res.json({ success: true, data: measurement });
  } catch (err) {
    handleNotFound(err, res, next);
  }
});

measurementsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteMeasurement(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
