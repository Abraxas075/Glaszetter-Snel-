import type { Company, User, UserRole } from '@glaszetter/shared';

// Raw snake_case row shapes as returned by `pg`, and mappers to the
// camelCase domain types used across the app.

export interface CompanyRow {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCompanyRow = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  taxId: row.tax_id ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  postalCode: row.postal_code ?? undefined,
  country: row.country ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  companyId: row.company_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
