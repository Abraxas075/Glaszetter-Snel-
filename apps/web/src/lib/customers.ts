import type { Customer, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './api';

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

export const listCustomers = (limit = 100): Promise<PaginatedResponse<Customer>> =>
  apiRequest<PaginatedResponse<Customer>>(`/customers?limit=${limit}`);

export const createCustomer = (input: CustomerInput): Promise<Customer> =>
  apiRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });
