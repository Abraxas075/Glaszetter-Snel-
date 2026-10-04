import express, { type RequestHandler } from 'express';
import { requireAuth } from './auth';

export const MEETBON_BODY_LIMIT = 8 * 1024 * 1024;
const standardJson = express.json();
const meetbonJson = express.json({ limit: MEETBON_BODY_LIMIT });
export const requestBodies: RequestHandler = (req, res, next) => {
  const bonWrite = ['PUT', 'DELETE'].includes(req.method)
    && /^\/api\/v1\/jobs\/[^/]+\/meetbon\/?$/.test(req.path);
  if (bonWrite) {
    requireAuth(req, res, error => error ? next(error) : meetbonJson(req, res, next));
  } else standardJson(req, res, next);
};

export function bodyError(error: { type?: string }) {
  if (error.type === 'entity.too.large') return {
    status: 413, error: { code: 'REQUEST_TOO_LARGE', message: 'De aanvraag is te groot. Meetbonnen mogen maximaal 8 MiB zijn; andere JSON-aanvragen maximaal 100 KiB.' },
  };
  if (error.type === 'entity.parse.failed') return {
    status: 400, error: { code: 'INVALID_JSON', message: 'De aanvraag bevat ongeldige JSON.' },
  };
  return undefined;
}
