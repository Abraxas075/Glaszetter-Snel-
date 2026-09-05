import type { Customer, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './api';

export const listCustomers = (limit = 100): Promise<PaginatedResponse<Customer>> =>
  apiRequest<PaginatedResponse<Customer>>(`/customers?limit=${limit}`);
