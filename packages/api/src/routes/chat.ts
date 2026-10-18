import multer from 'multer';
import { MEDIA_MAX_BYTES } from '@glaszetter/shared';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  chatChannels,
  chatMessages,
  sendChatMessage,
  sendChatAttachment,
  checkChatUser,
  checkChatChannel,
} from '../services/chatService';
export const chatRouter = Router();
chatRouter.use(requireAuth);
chatRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
chatRouter.get('/channels', async (req, res, next) => {
  try {
    res.json({ success: true, data: await chatChannels(req.auth!.companyId, req.auth!.userId) });
  } catch (error) {
    next(error);
  }
});
chatRouter.get('/channels/:id/messages', async (req, res, next) => {
  try {
    if (req.query.before !== undefined && typeof req.query.before !== 'string') {
      res
        .status(400)
        .json({
          success: false,
          error: { code: 'CHAT_ERROR', message: 'Ongeldige berichtpagina.' },
        });
      return;
    }
    res.json({
      success: true,
      data: await chatMessages(
        req.auth!.companyId,
        req.auth!.userId,
        req.params.id,
        req.query.before as string | undefined
      ),
    });
  } catch (error) {
    next(error);
  }
});
chatRouter.post('/channels/:id/messages', async (req, res, next) => {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: await sendChatMessage(
          req.auth!.companyId,
          req.auth!.userId,
          req.params.id,
          req.body || {}
        ),
      });
  } catch (error) {
    next(error);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: 1, fields: 2, fieldSize: 20000, parts: 4 },
}).single('file');
chatRouter.post(
  '/channels/:id/attachments',
  async (req, _res, next) => {
    try {
      await checkChatUser(req.auth!.companyId, req.auth!.userId);
      await checkChatChannel(req.auth!.companyId, req.params.id);
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
              code: 'CHAT_UPLOAD_ERROR',
              message: 'Kies één foto (tot 15 MB) of video (tot 50 MB).',
            },
          });
        return;
      }
      next();
    }),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'CHAT_UPLOAD_ERROR', message: 'Kies een foto of video.' },
          });
        return;
      }
      res
        .status(201)
        .json({
          success: true,
          data: await sendChatAttachment(
            req.auth!.companyId,
            req.auth!.userId,
            req.params.id,
            req.body || {},
            req.file
          ),
        });
    } catch (error) {
      next(error);
    }
  }
);
