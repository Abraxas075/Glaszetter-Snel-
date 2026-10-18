import { randomUUID } from 'crypto';
import { MEDIA_MAX_BYTES, PHOTO_MAX_BYTES, type JobMedia } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { uploadToBucket, deleteFromBucket } from './s3Client';
const invalid = (message: string, status = 400) =>
  Object.assign(new Error(message), { status, code: 'INVALID_MEDIA' });
export async function assertMediaJob(companyId: string, jobId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId))
    throw invalid('Kies een geldige klus.');
  const result = await pool.query('SELECT id FROM jobs WHERE id=$1 AND company_id=$2', [
    jobId,
    companyId,
  ]);
  if (!result.rows.length) throw invalid('Klus niet gevonden.', 404);
}
// Match supported file signatures rather than trusting extensions or multipart MIME claims.
export function detectMedia(buffer: Buffer): {
  kind: 'photo' | 'video';
  mime: string;
  extension: string;
} {
  if (!buffer.length || buffer.length > MEDIA_MAX_BYTES)
    throw invalid('Bestand is leeg of groter dan 50 MB.', 413);
  let mime = '',
    extension = '',
    kind: 'photo' | 'video' = 'photo';
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    mime = 'image/jpeg';
    extension = 'jpg';
  } else if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    mime = 'image/png';
    extension = 'png';
  } else if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    mime = 'image/webp';
    extension = 'webp';
  } else if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brands = buffer.toString('ascii', 8, Math.min(buffer.length, 64));
    if (brands.includes('qt  ')) {
      mime = 'video/quicktime';
      extension = 'mov';
      kind = 'video';
    } else if (/(isom|iso[2-9]|mp4[12]|avc1|M4V |3gp[456])/.test(brands)) {
      mime = 'video/mp4';
      extension = 'mp4';
      kind = 'video';
    }
  } else if (
    buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) &&
    buffer.subarray(0, 4096).includes(Buffer.from('webm'))
  ) {
    mime = 'video/webm';
    extension = 'webm';
    kind = 'video';
  }
  if (!mime) throw invalid('Gebruik JPG, PNG, WEBP, MP4, MOV of WEBM.');
  if (kind === 'photo' && buffer.length > PHOTO_MAX_BYTES)
    throw invalid('Een foto mag maximaal 15 MB zijn.', 413);
  return { kind, mime, extension };
}
export async function listJobMedia(companyId: string, jobId: string): Promise<JobMedia[]> {
  await assertMediaJob(companyId, jobId);
  // Include older element-only photos in the selected job without changing their PDF association.
  const result = await pool.query<JobMedia>(
    `
    SELECT p.id, COALESCE(p.job_id,e.job_id) AS "jobId", 'photo' AS kind, p.url,
      COALESCE(p.original_filename,'Foto') AS filename, COALESCE(p.caption,'') AS caption, p.created_at AS "createdAt"
    FROM photos p LEFT JOIN elements e ON e.id=p.element_id AND e.company_id=p.company_id
    WHERE p.company_id=$1 AND (p.job_id=$2 OR (p.job_id IS NULL AND e.job_id=$2))
    UNION ALL
    SELECT id,job_id AS "jobId",'video' AS kind,url,filename,caption,created_at AS "createdAt"
    FROM job_videos WHERE company_id=$1 AND job_id=$2
    UNION ALL
    SELECT id,job_id AS "jobId",attachment_kind AS kind,attachment_url AS url,attachment_filename AS filename,body AS caption,created_at AS "createdAt"
    FROM chat_messages WHERE company_id=$1 AND job_id=$2 AND attachment_key IS NOT NULL
    ORDER BY "createdAt" DESC,id`,
    [companyId, jobId]
  );
  return result.rows;
}
export async function addJobMedia(
  companyId: string,
  jobId: string,
  file: { buffer: Buffer; originalname: string },
  caption: string
): Promise<JobMedia> {
  await assertMediaJob(companyId, jobId);
  if (caption.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(caption))
    throw invalid('Gebruik maximaal 1000 tekens voor de beschrijving.');
  const { kind, mime, extension } = detectMedia(file.buffer);
  const filename = (file.originalname.split(/[\\/]/).pop() || 'Bestand')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, 180);
  const storageKey = `companies/${companyId}/media/${randomUUID()}.${extension}`;
  const url = await uploadToBucket(storageKey, file.buffer, mime);
  try {
    if (kind === 'photo') {
      const photo = await pool.query<JobMedia>(
        `INSERT INTO photos(company_id,job_id,storage_key,url,original_filename,content_type,size_bytes,caption)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,job_id AS "jobId",'photo' AS kind,url,original_filename AS filename,caption,created_at AS "createdAt"`,
        [companyId, jobId, storageKey, url, filename, mime, file.buffer.length, caption]
      );
      return photo.rows[0];
    }
    const result = await pool.query<JobMedia>(
      `INSERT INTO job_videos(company_id,job_id,storage_key,url,filename,content_type,size_bytes,caption)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,job_id AS "jobId",'video' AS kind,url,filename,caption,created_at AS "createdAt"`,
      [companyId, jobId, storageKey, url, filename, mime, file.buffer.length, caption]
    );
    return result.rows[0];
  } catch (error) {
    await deleteFromBucket(storageKey).catch(() => {});
    throw error;
  }
}
