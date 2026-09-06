import { randomUUID } from 'crypto';
import type { Photo } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapPhotoRow, type PhotoRow } from '../db/rows';
import { NotFoundError } from '../errors';
import { deleteFromBucket, uploadToBucket } from './s3Client';

export interface UploadPhotoInput {
  jobId?: string;
  elementId?: string;
  caption?: string;
  buffer: Buffer;
  originalFilename: string;
  contentType: string;
}

const assertJobInCompany = async (companyId: string, jobId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM jobs WHERE id = $1 AND company_id = $2', [
    jobId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Job');
};

const assertElementInCompany = async (companyId: string, elementId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM elements WHERE id = $1 AND company_id = $2', [
    elementId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Element');
};

export const uploadPhoto = async (companyId: string, input: UploadPhotoInput): Promise<Photo> => {
  if (input.jobId) await assertJobInCompany(companyId, input.jobId);
  if (input.elementId) await assertElementInCompany(companyId, input.elementId);

  const storageKey = `companies/${companyId}/${randomUUID()}-${input.originalFilename}`;
  const url = await uploadToBucket(storageKey, input.buffer, input.contentType);

  const result = await pool.query<PhotoRow>(
    `INSERT INTO photos (company_id, job_id, element_id, storage_key, url, original_filename, content_type, size_bytes, caption)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      companyId,
      input.jobId ?? null,
      input.elementId ?? null,
      storageKey,
      url,
      input.originalFilename,
      input.contentType,
      input.buffer.byteLength,
      input.caption ?? null,
    ]
  );

  return mapPhotoRow(result.rows[0]);
};

export const listPhotos = async (
  companyId: string,
  filters: { jobId?: string; elementId?: string }
): Promise<Photo[]> => {
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.jobId) {
    params.push(filters.jobId);
    conditions.push(`job_id = $${params.length}`);
  }
  if (filters.elementId) {
    params.push(filters.elementId);
    conditions.push(`element_id = $${params.length}`);
  }

  const result = await pool.query<PhotoRow>(
    `SELECT * FROM photos WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );

  return result.rows.map(mapPhotoRow);
};

export const deletePhoto = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query<PhotoRow>(
    'SELECT * FROM photos WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Photo');

  await deleteFromBucket(row.storage_key);
  await pool.query('DELETE FROM photos WHERE id = $1 AND company_id = $2', [id, companyId]);
};
