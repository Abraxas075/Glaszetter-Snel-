import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../errors';
import { deletePhoto, listPhotos, uploadPhoto } from '../services/photoService';

export const photosRouter = Router();

photosRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

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

photosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const elementId = typeof req.query.elementId === 'string' ? req.query.elementId : undefined;
    const photos = await listPhotos(req.auth!.companyId, { jobId, elementId });
    res.json({ success: true, data: photos });
  } catch (err) {
    next(err);
  }
});

photosRouter.post(
  '/',
  upload.single('photo'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const jobId = typeof req.body?.jobId === 'string' && req.body.jobId ? req.body.jobId : undefined;
    const elementId =
      typeof req.body?.elementId === 'string' && req.body.elementId ? req.body.elementId : undefined;
    const caption =
      typeof req.body?.caption === 'string' && req.body.caption ? req.body.caption : undefined;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'photo file is required' },
      });
      return;
    }

    if (!jobId && !elementId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'jobId or elementId is required' },
      });
      return;
    }

    try {
      const photo = await uploadPhoto(req.auth!.companyId, {
        jobId,
        elementId,
        caption,
        buffer: req.file.buffer,
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      res.status(201).json({ success: true, data: photo });
    } catch (err) {
      handleNotFound(err, res, next);
    }
  }
);

photosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deletePhoto(req.auth!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleNotFound(err, res, next);
  }
});
