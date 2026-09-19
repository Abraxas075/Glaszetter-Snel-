import type { Customer, PaginatedResponse, PaginationParams } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapCustomerRow, type CustomerRow } from '../db/rows';
import { ConflictError, NotFoundError } from '../errors';

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
}

export const listCustomers = async (
  companyId: string,
  { page, limit }: PaginationParams
): Promise<PaginatedResponse<Customer>> => {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query<CustomerRow>(
      `SELECT * FROM customers WHERE company_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [companyId, limit, offset]
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM customers WHERE company_id = $1',
      [companyId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: rowsResult.rows.map(mapCustomerRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getCustomer = async (companyId: string, id: string): Promise<Customer> => {
  const result = await pool.query<CustomerRow>(
    'SELECT * FROM customers WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Customer');
  return mapCustomerRow(row);
};

export const createCustomer = async (
  companyId: string,
  input: CustomerInput
): Promise<Customer> => {
  const result = await pool.query<CustomerRow>(
    `INSERT INTO customers
       (company_id, name, email, phone, address, city, postal_code, country, tax_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      companyId,
      input.name,
      input.email ?? null,
      input.phone ?? null,
      input.address ?? null,
      input.city ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.taxId ?? null,
    ]
  );
  return mapCustomerRow(result.rows[0]);
};

export const updateCustomer = async (
  companyId: string,
  id: string,
  input: Partial<CustomerInput>
): Promise<Customer> => {
  await getCustomer(companyId, id); // ensures existence + tenant ownership

  const result = await pool.query<CustomerRow>(
    `UPDATE customers SET
       name = COALESCE($3, name),
       email = CASE WHEN $11::boolean THEN $4::text ELSE email END,
       phone = CASE WHEN $12::boolean THEN $5::text ELSE phone END,
       address = CASE WHEN $13::boolean THEN $6::text ELSE address END,
       city = CASE WHEN $14::boolean THEN $7::text ELSE city END,
       postal_code = CASE WHEN $15::boolean THEN $8::text ELSE postal_code END,
       country = CASE WHEN $16::boolean THEN $9::text ELSE country END,
       tax_id = CASE WHEN $17::boolean THEN $10::text ELSE tax_id END,
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.name ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.address ?? null,
      input.city ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.taxId ?? null,
      input.email !== undefined,
      input.phone !== undefined,
      input.address !== undefined,
      input.city !== undefined,
      input.postalCode !== undefined,
      input.country !== undefined,
      input.taxId !== undefined,
    ]
  );
  return mapCustomerRow(result.rows[0]);
};

export const deleteCustomer = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query(
    `DELETE FROM customers AS customer
     WHERE customer.id = $1
       AND customer.company_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM projects WHERE projects.customer_id = customer.id
       )
     RETURNING customer.id`,
    [id, companyId]
  );
  if (result.rowCount !== 0) return;

  await getCustomer(companyId, id);
  throw new ConflictError(
    'Verwijder eerst de projecten van deze klant.',
    'CUSTOMER_HAS_PROJECTS'
  );
};
