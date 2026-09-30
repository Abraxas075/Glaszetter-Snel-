import { emptyMeetbon, type Meetbon } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { getJob } from './jobService';
export async function getMeetbon(companyId: string, jobId: string): Promise<Meetbon> {
  await getJob(companyId, jobId);
  const result = await pool.query<{ data: Meetbon }>('SELECT data FROM meetbons WHERE job_id = $1', [jobId]);
  return result.rows[0]?.data ?? emptyMeetbon();
}
export async function saveMeetbon(companyId: string, jobId: string, data: Meetbon): Promise<Meetbon> {
  await getJob(companyId, jobId);
  const result = await pool.query<{ data: Meetbon }>(
    `INSERT INTO meetbons (job_id, data) VALUES ($1, $2::jsonb)
     ON CONFLICT (job_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING data`,
    [jobId, JSON.stringify(data)]);
  return result.rows[0].data;
}
