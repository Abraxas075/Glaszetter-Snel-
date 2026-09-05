import type {
  Element,
  ElementType,
  Measurement,
  MeasurementStatus,
  PaginatedResponse,
  PaginationParams,
} from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapElementRow, mapMeasurementRow, type ElementRow, type MeasurementRow } from '../db/rows';
import { NotFoundError } from '../errors';

export interface ElementInput {
  jobId: string;
  code: string;
  type: ElementType;
  location?: string;
  notes?: string;
}

export interface MeasurementInput {
  width: number;
  height: number;
  glassType?: string;
  notes?: string;
  status?: MeasurementStatus;
}

export interface ElementWithMeasurement {
  element: Element;
  measurement: Measurement;
}

const getJobInCompany = async (
  companyId: string,
  jobId: string
): Promise<{ id: string; project_id: string }> => {
  const result = await pool.query<{ id: string; project_id: string }>(
    'SELECT id, project_id FROM jobs WHERE id = $1 AND company_id = $2',
    [jobId, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Job');
  return row;
};

export const listElements = async (
  companyId: string,
  { page, limit }: PaginationParams,
  filters: { jobId?: string } = {}
): Promise<PaginatedResponse<Element>> => {
  const offset = (page - 1) * limit;
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.jobId) {
    params.push(filters.jobId);
    conditions.push(`job_id = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const [rowsResult, countResult] = await Promise.all([
    pool.query<ElementRow>(
      `SELECT * FROM elements WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM elements WHERE ${whereClause}`, params),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: rowsResult.rows.map(mapElementRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getElement = async (companyId: string, id: string): Promise<Element> => {
  const result = await pool.query<ElementRow>(
    'SELECT * FROM elements WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Element');
  return mapElementRow(row);
};

export const suggestNextCode = async (
  companyId: string,
  jobId: string,
  prefix: string
): Promise<string> => {
  await getJobInCompany(companyId, jobId);

  const result = await pool.query<{ code: string }>(
    `SELECT code FROM elements
     WHERE job_id = $1 AND code ~ $2
     ORDER BY (substring(code from $3))::int DESC
     LIMIT 1`,
    [jobId, `^${prefix}[0-9]+$`, `${prefix.length + 1}`]
  );

  const lastNumber = result.rows[0] ? parseInt(result.rows[0].code.slice(prefix.length), 10) : 0;
  const nextNumber = lastNumber + 1;
  return `${prefix}${String(nextNumber).padStart(2, '0')}`;
};

export const createElementWithMeasurement = async (
  companyId: string,
  elementInput: ElementInput,
  measurementInput: MeasurementInput
): Promise<ElementWithMeasurement> => {
  const job = await getJobInCompany(companyId, elementInput.jobId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const elementResult = await client.query<ElementRow>(
      `INSERT INTO elements (company_id, job_id, project_id, code, type, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        companyId,
        elementInput.jobId,
        job.project_id,
        elementInput.code,
        elementInput.type,
        elementInput.location ?? null,
        elementInput.notes ?? null,
      ]
    );
    const element = mapElementRow(elementResult.rows[0]);

    const measurementResult = await client.query<MeasurementRow>(
      `INSERT INTO measurements (company_id, element_id, job_id, width, height, glass_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::measurement_status, 'draft'))
       RETURNING *`,
      [
        companyId,
        element.id,
        elementInput.jobId,
        measurementInput.width,
        measurementInput.height,
        measurementInput.glassType ?? null,
        measurementInput.notes ?? null,
        measurementInput.status ?? null,
      ]
    );
    const measurement = mapMeasurementRow(measurementResult.rows[0]);

    await client.query('COMMIT');
    return { element, measurement };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updateElement = async (
  companyId: string,
  id: string,
  input: Partial<Omit<ElementInput, 'jobId'>>
): Promise<Element> => {
  await getElement(companyId, id);

  const result = await pool.query<ElementRow>(
    `UPDATE elements SET
       code = COALESCE($3, code),
       type = COALESCE($4::element_type, type),
       location = COALESCE($5, location),
       notes = COALESCE($6, notes),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [id, companyId, input.code ?? null, input.type ?? null, input.location ?? null, input.notes ?? null]
  );
  return mapElementRow(result.rows[0]);
};

export const deleteElement = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM elements WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Element');
};
