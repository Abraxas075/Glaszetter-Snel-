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
  scheduledDate?: string;
  notes?: string;
}

export interface JobFilters {
  projectId?: string;
  teamId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  mine?: boolean;
  userId?: string;
}

const assertProjectInCompany = async (companyId: string, projectId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM projects WHERE id = $1 AND company_id = $2', [
    projectId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Project');
};

const assertTeamInCompany = async (companyId: string, teamId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM teams WHERE id = $1 AND company_id = $2', [
    teamId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Team');
};

export const listJobs = async (
  companyId: string,
  { page, limit }: PaginationParams,
  filters: JobFilters = {}
): Promise<PaginatedResponse<Job>> => {
  const offset = (page - 1) * limit;
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`project_id = $${params.length}`);
  }

  if (filters.teamId) {
    params.push(filters.teamId);
    conditions.push(`team_id = $${params.length}`);
  }

  if (filters.scheduledFrom) {
    params.push(filters.scheduledFrom);
    conditions.push(`scheduled_date >= $${params.length}`);
  }

  if (filters.scheduledTo) {
    params.push(filters.scheduledTo);
    conditions.push(`scheduled_date <= $${params.length}`);
  }

  if (filters.mine && filters.userId) {
    params.push(filters.userId);
    conditions.push(
      `team_id IN (SELECT team_id FROM team_members WHERE user_id = $${params.length})`
    );
  }

  const whereClause = conditions.join(' AND ');

  const [rowsResult, countResult] = await Promise.all([
    pool.query<JobRow>(
      `SELECT * FROM jobs WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM jobs WHERE ${whereClause}`, params),
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
  if (input.teamId) {
    await assertTeamInCompany(companyId, input.teamId);
  }

  const result = await pool.query<JobRow>(
    `INSERT INTO jobs (company_id, project_id, name, status, due_date, team_id, scheduled_date, notes)
     VALUES ($1, $2, $3, COALESCE($4::job_status, 'concept'), $5, $6, $7, $8)
     RETURNING *`,
    [
      companyId,
      input.projectId,
      input.name,
      input.status ?? null,
      input.dueDate ?? null,
      input.teamId ?? null,
      input.scheduledDate ?? null,
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
  if (input.teamId) {
    await assertTeamInCompany(companyId, input.teamId);
  }

  const result = await pool.query<JobRow>(
    `UPDATE jobs SET
       project_id = COALESCE($3, project_id),
       name = COALESCE($4, name),
       status = COALESCE($5::job_status, status),
       due_date = COALESCE($6, due_date),
       team_id = COALESCE($7, team_id),
       scheduled_date = COALESCE($8, scheduled_date),
       notes = COALESCE($9, notes),
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
      input.scheduledDate ?? null,
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
