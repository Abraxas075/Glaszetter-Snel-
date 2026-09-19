import type {
  PaginatedResponse,
  PaginationParams,
  Project,
  ProjectStatus,
} from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapProjectRow, type ProjectRow } from '../db/rows';
import { ConflictError, NotFoundError } from '../errors';

export interface ProjectInput {
  customerId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  status?: ProjectStatus;
}

const assertCustomerInCompany = async (companyId: string, customerId: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM customers WHERE id = $1 AND company_id = $2', [
    customerId,
    companyId,
  ]);
  if (result.rows.length === 0) throw new NotFoundError('Customer');
};

export const listProjects = async (
  companyId: string,
  { page, limit }: PaginationParams
): Promise<PaginatedResponse<Project>> => {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query<ProjectRow>(
      `SELECT * FROM projects WHERE company_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [companyId, limit, offset]
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM projects WHERE company_id = $1',
      [companyId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: rowsResult.rows.map(mapProjectRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getProject = async (companyId: string, id: string): Promise<Project> => {
  const result = await pool.query<ProjectRow>(
    'SELECT * FROM projects WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Project');
  return mapProjectRow(row);
};

export const createProject = async (
  companyId: string,
  input: ProjectInput
): Promise<Project> => {
  await assertCustomerInCompany(companyId, input.customerId);

  const result = await pool.query<ProjectRow>(
    `INSERT INTO projects (company_id, customer_id, name, address, city, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::project_status, 'concept'))
     RETURNING *`,
    [
      companyId,
      input.customerId,
      input.name,
      input.address ?? null,
      input.city ?? null,
      input.description ?? null,
      input.status ?? null,
    ]
  );
  return mapProjectRow(result.rows[0]);
};

export const updateProject = async (
  companyId: string,
  id: string,
  input: Partial<ProjectInput>
): Promise<Project> => {
  await getProject(companyId, id); // ensures existence + tenant ownership

  if (input.customerId) {
    await assertCustomerInCompany(companyId, input.customerId);
  }

  const result = await pool.query<ProjectRow>(
    `UPDATE projects SET
       customer_id = COALESCE($3, customer_id),
       name = COALESCE($4, name),
       address = CASE WHEN $9::boolean THEN $5::text ELSE address END,
       city = CASE WHEN $10::boolean THEN $6::text ELSE city END,
       description = CASE WHEN $11::boolean THEN $7::text ELSE description END,
       status = COALESCE($8, status),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.customerId ?? null,
      input.name ?? null,
      input.address ?? null,
      input.city ?? null,
      input.description ?? null,
      input.status ?? null,
      input.address !== undefined,
      input.city !== undefined,
      input.description !== undefined,
    ]
  );
  return mapProjectRow(result.rows[0]);
};

export const deleteProject = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query(
    `DELETE FROM projects AS project
     WHERE project.id = $1
       AND project.company_id = $2
       AND NOT EXISTS (SELECT 1 FROM jobs WHERE jobs.project_id = project.id)
     RETURNING project.id`,
    [id, companyId]
  );
  if (result.rowCount !== 0) return;

  await getProject(companyId, id);
  throw new ConflictError(
    'Verwijder eerst de klussen van dit project.',
    'PROJECT_HAS_JOBS'
  );
};
