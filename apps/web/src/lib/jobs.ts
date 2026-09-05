import type { Job, JobStatus, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface JobInput {
  projectId: string;
  name: string;
  status?: JobStatus;
  dueDate?: string;
  notes?: string;
}

export const listJobs = (
  limit = 100,
  filters: { projectId?: string } = {}
): Promise<PaginatedResponse<Job>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters.projectId) params.set('projectId', filters.projectId);
  return apiRequest<PaginatedResponse<Job>>(`/jobs?${params.toString()}`);
};

export const getJob = (id: string): Promise<Job> => apiRequest<Job>(`/jobs/${id}`);

export const createJob = (input: JobInput): Promise<Job> =>
  apiRequest<Job>('/jobs', { method: 'POST', body: JSON.stringify(input) });

export const updateJob = (id: string, input: Partial<JobInput>): Promise<Job> =>
  apiRequest<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
