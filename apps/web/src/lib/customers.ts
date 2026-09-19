import type { Customer, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './api';

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

export const listCustomers = (limit = 100): Promise<PaginatedResponse<Customer>> =>
  apiRequest<PaginatedResponse<Customer>>(`/customers?limit=${limit}`);

export const createCustomer = (input: CustomerInput): Promise<Customer> =>
  apiRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });

export const getCustomer = (id: string): Promise<Customer> =>
  apiRequest<Customer>(`/customers/${id}`);

export const updateCustomer = (id: string, input: Partial<CustomerInput>): Promise<Customer> =>
  apiRequest<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteCustomer = (id: string): Promise<void> =>
  apiRequest<void>(`/customers/${id}`, { method: 'DELETE' });
