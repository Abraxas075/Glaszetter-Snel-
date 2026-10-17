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

// Load every project so a job never loses its address after the first 100 projects.
export async function listAllProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await apiRequest<PaginatedResponse<Project>>(`/projects?limit=100&page=${page}`);
    projects.push(...result.data);
    totalPages = result.totalPages;
    page++;
  } while (page <= totalPages);
  return projects;
}
