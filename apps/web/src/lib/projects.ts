import type { PaginatedResponse, Project, ProjectStatus } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface ProjectInput {
  customerId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  status?: ProjectStatus;
}

export const listProjects = (limit = 100): Promise<PaginatedResponse<Project>> =>
  apiRequest<PaginatedResponse<Project>>(`/projects?limit=${limit}`);

export const getProject = (id: string): Promise<Project> =>
  apiRequest<Project>(`/projects/${id}`);

export const createProject = (input: ProjectInput): Promise<Project> =>
  apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(input) });

export const updateProject = (id: string, input: Partial<ProjectInput>): Promise<Project> =>
  apiRequest<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteProject = (id: string): Promise<void> =>
  apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
