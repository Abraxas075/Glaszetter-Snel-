import type { Job, JobStatus, PaginatedResponse, PaginationParams } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapJobRow, type JobRow } from '../db/rows';
import { NotFoundError } from '../errors';

export interface JobInput {
  projectId: string;
  name: string;
  status?: JobStatus;
  dueDate?: string;
  teamId?: string;
  notes?: string;
}

const assertProjectInCompany = async (companyId: string, projectId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM projects WHERE id = $1 AND company_id = $2', [
    projectId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Project');
};

export const listJobs = async (
  companyId: string,
  { page, limit }: PaginationParams
): Promise<PaginatedResponse<Job>> => {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query<JobRow>(
      `SELECT * FROM jobs WHERE company_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [companyId, limit, offset]
    ),
    pool.query<{ count: string }>('SELECT COUNT(*) FROM jobs WHERE company_id = $1', [companyId]),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: rowsResult.rows.map(mapJobRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getJob = async (companyId: string, id: string): Promise<Job> => {
  const result = await pool.query<JobRow>(
    'SELECT * FROM jobs WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Job');
  return mapJobRow(row);
};

export const createJob = async (companyId: string, input: JobInput): Promise<Job> => {
  await assertProjectInCompany(companyId, input.projectId);

  const result = await pool.query<JobRow>(
    `INSERT INTO jobs (company_id, project_id, name, status, due_date, team_id, notes)
     VALUES ($1, $2, $3, COALESCE($4::job_status, 'concept'), $5, $6, $7)
     RETURNING *`,
    [
      companyId,
      input.projectId,
      input.name,
      input.status ?? null,
      input.dueDate ?? null,
      input.teamId ?? null,
      input.notes ?? null,
    ]
  );
  return mapJobRow(result.rows[0]);
};

export const updateJob = async (
  companyId: string,
  id: string,
  input: Partial<JobInput>
): Promise<Job> => {
  await getJob(companyId, id); // ensures existence + tenant ownership

  if (input.projectId) {
    await assertProjectInCompany(companyId, input.projectId);
  }

  const result = await pool.query<JobRow>(
    `UPDATE jobs SET
       project_id = COALESCE($3, project_id),
       name = COALESCE($4, name),
       status = COALESCE($5::job_status, status),
       due_date = COALESCE($6, due_date),
       team_id = COALESCE($7, team_id),
       notes = COALESCE($8, notes),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.projectId ?? null,
      input.name ?? null,
      input.status ?? null,
      input.dueDate ?? null,
      input.teamId ?? null,
      input.notes ?? null,
    ]
  );
  return mapJobRow(result.rows[0]);
};

export const deleteJob = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM jobs WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Job');
};
