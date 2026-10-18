import { Router } from 'express';
import multer from 'multer';
import { MEDIA_MAX_BYTES } from '@glaszetter/shared';
import { requireAuth } from '../middleware/auth';
import { assertMediaJob, listJobMedia, addJobMedia } from '../services/mediaService';
export const mediaRouter = Router();
mediaRouter.use(requireAuth);
mediaRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
mediaRouter.get('/', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await listJobMedia(
        req.auth!.companyId,
        typeof req.query.jobId === 'string' ? req.query.jobId : ''
      ),
    });
  } catch (error) {
    next(error);
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: 1, fields: 1, fieldSize: 4096, parts: 3 },
}).single('file');
// Validate company ownership before buffering any file bytes.
mediaRouter.post(
  '/:jobId',
  async (req, _res, next) => {
    try {
      await assertMediaJob(req.auth!.companyId, req.params.jobId);
      next();
    } catch (error) {
      next(error);
    }
  },
  (req, res, next) =>
    upload(req, res, (error) => {
      if (error) {
        res
          .status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
          .json({
            success: false,
            error: {
              code: 'INVALID_MEDIA',
              message:
                'Upload mislukt. Kies één bestand van maximaal 50 MB met een korte beschrijving.',
            },
          });
        return;
      }
      next();
    }),
  async (req, res, next) => {
    try {
      if (!req.file || (req.body.caption !== undefined && typeof req.body.caption !== 'string')) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'INVALID_MEDIA', message: 'Kies één foto of video.' },
          });
        return;
      }
      res
        .status(201)
        .json({
          success: true,
          data: await addJobMedia(
            req.auth!.companyId,
            req.params.jobId,
            req.file,
            req.body.caption || ''
          ),
        });
    } catch (error) {
      next(error);
    }
  }
);
