import type { Company } from '@glaszetter/shared';
import { apiRequest } from './api';

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

export const getMyCompany = (): Promise<Company> => apiRequest<Company>('/companies/me');

export const updateMyCompany = (input: CompanyInput): Promise<Company> =>
  apiRequest<Company>('/companies/me', { method: 'PATCH', body: JSON.stringify(input) });
