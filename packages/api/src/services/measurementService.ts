import type { Measurement, PaginatedResponse, PaginationParams } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapMeasurementRow, type MeasurementRow } from '../db/rows';
import { NotFoundError } from '../errors';
import type { MeasurementInput } from './elementService';

export const listMeasurements = async (
  companyId: string,
  { page, limit }: PaginationParams,
  filters: { elementId?: string; jobId?: string } = {}
): Promise<PaginatedResponse<Measurement>> => {
  const offset = (page - 1) * limit;
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.elementId) {
    params.push(filters.elementId);
    conditions.push(`element_id = $${params.length}`);
  }
  if (filters.jobId) {
    params.push(filters.jobId);
    conditions.push(`job_id = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const [rowsResult, countResult] = await Promise.all([
    pool.query<MeasurementRow>(
      `SELECT * FROM measurements WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM measurements WHERE ${whereClause}`, params),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: rowsResult.rows.map(mapMeasurementRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getMeasurement = async (companyId: string, id: string): Promise<Measurement> => {
  const result = await pool.query<MeasurementRow>(
    'SELECT * FROM measurements WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Measurement');
  return mapMeasurementRow(row);
};

export const updateMeasurement = async (
  companyId: string,
  id: string,
  input: Partial<MeasurementInput>
): Promise<Measurement> => {
  await getMeasurement(companyId, id);

  const result = await pool.query<MeasurementRow>(
    `UPDATE measurements SET
       width = COALESCE($3, width),
       height = COALESCE($4, height),
       glass_type = COALESCE($5, glass_type),
       notes = COALESCE($6, notes),
       status = COALESCE($7::measurement_status, status),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.width ?? null,
      input.height ?? null,
      input.glassType ?? null,
      input.notes ?? null,
      input.status ?? null,
    ]
  );
  return mapMeasurementRow(result.rows[0]);
};

export const deleteMeasurement = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM measurements WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Measurement');
};
