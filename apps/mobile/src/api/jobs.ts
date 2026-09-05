import type { Job, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './client';

export const listJobs = (token: string): Promise<PaginatedResponse<Job>> =>
  apiRequest<PaginatedResponse<Job>>('/jobs?limit=100', { token });
