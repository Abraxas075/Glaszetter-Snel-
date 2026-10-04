import { randomUUID } from 'node:crypto';
import { emptyMeetbon, type Meetbon } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { ConflictError } from '../errors';
import { getJob } from './jobService';
const changed = () => new ConflictError('De meetbon is inmiddels gewijzigd. Vergelijk de nieuwste bon met je eigen invoer.', 'MEETBON_CHANGED');
export async function getMeetbon(companyId: string, jobId: string): Promise<Meetbon> {
  await getJob(companyId, jobId);
  const result = await pool.query<{ data: Meetbon; revision: string }>('SELECT data, revision FROM meetbons WHERE job_id = $1', [jobId]);
  const row = result.rows[0];
  return row ? { ...row.data, revision: row.revision } : { ...emptyMeetbon(), revision: null };
}
export async function saveMeetbon(companyId: string, jobId: string, data: Meetbon): Promise<Meetbon> {
  await getJob(companyId, jobId);
  if (data.revision === undefined) throw changed();
  const revision = randomUUID();
  const content = JSON.stringify({ fields: data.fields, checks: data.checks, lines: data.lines });
  // One conditional statement: two clients cannot both save the same revision.
  const result = data.revision === null
    ? await pool.query(`INSERT INTO meetbons (job_id, data, revision) VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (job_id) DO NOTHING RETURNING data, revision`, [jobId, content, revision])
    : await pool.query(`UPDATE meetbons SET data = $2::jsonb, revision = $3, updated_at = now()
        WHERE job_id = $1 AND revision = $4 RETURNING data, revision`, [jobId, content, revision, data.revision]);
  if (!result.rows.length) throw changed();
  return { ...result.rows[0].data, revision: result.rows[0].revision };
}
export async function deleteMeetbon(companyId: string, jobId: string, expected: Meetbon): Promise<void> {
  await getJob(companyId, jobId);
  if (expected.revision === undefined) throw changed();
  const result = await pool.query(`DELETE FROM meetbons USING jobs
     WHERE meetbons.job_id = jobs.id AND jobs.id = $1 AND jobs.company_id = $2
       AND meetbons.revision = $3 RETURNING meetbons.job_id`, [jobId, companyId, expected.revision]);
  if (result.rows.length) return;
  const remaining = await pool.query('SELECT job_id FROM meetbons WHERE job_id = $1', [jobId]);
  if (remaining.rows.length) throw changed();
}
