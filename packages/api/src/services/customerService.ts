import type { Customer, PaginatedResponse, PaginationParams } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapCustomerRow, type CustomerRow } from '../db/rows';
import { NotFoundError } from '../errors';

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
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
       email = COALESCE($4, email),
       phone = COALESCE($5, phone),
       address = COALESCE($6, address),
       city = COALESCE($7, city),
       postal_code = COALESCE($8, postal_code),
       country = COALESCE($9, country),
       tax_id = COALESCE($10, tax_id),
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
    ]
  );
  return mapCustomerRow(result.rows[0]);
};

export const deleteCustomer = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM customers WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Customer');
};
