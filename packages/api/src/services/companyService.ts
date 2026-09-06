import type { Company } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapCompanyRow, type CompanyRow } from '../db/rows';
import { NotFoundError } from '../errors';

export interface CompanyInput {
  name?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  iban?: string;
}

export const getCompany = async (companyId: string): Promise<Company> => {
  const result = await pool.query<CompanyRow>('SELECT * FROM companies WHERE id = $1', [
    companyId,
  ]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Company');
  return mapCompanyRow(row);
};

export const updateCompany = async (
  companyId: string,
  input: CompanyInput
): Promise<Company> => {
  const result = await pool.query<CompanyRow>(
    `UPDATE companies SET
       name = COALESCE($2, name),
       tax_id = COALESCE($3, tax_id),
       phone = COALESCE($4, phone),
       email = COALESCE($5, email),
       address = COALESCE($6, address),
       city = COALESCE($7, city),
       postal_code = COALESCE($8, postal_code),
       country = COALESCE($9, country),
       iban = COALESCE($10, iban),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      companyId,
      input.name ?? null,
      input.taxId ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.city ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.iban ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Company');
  return mapCompanyRow(row);
};
