import type { Job, Project, Customer, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './client';
import { dayRange } from '../utils/dayRange';
export async function todayJobCount(token: string) {
  const range = dayRange();
  const query = `mine=true&limit=1&scheduledFrom=${encodeURIComponent(range.from)}&scheduledTo=${encodeURIComponent(range.to)}`;
  return (await apiRequest<PaginatedResponse<Job>>(`/jobs?${query}`, { token })).total;
}
async function allPages<T>(path: string, token: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let pages = 1;
  do {
    const result = await apiRequest<PaginatedResponse<T>>(
      `${path}${path.includes('?') ? '&' : '?'}limit=100&page=${page}`,
      { token }
    );
    items.push(...result.data);
    pages = result.totalPages;
    page++;
  } while (page <= pages);
  return items;
}
export const agendaJobs = (token: string) => allPages<Job>('/jobs?mine=true', token);
export const customerDirectory = (token: string) => allPages<Customer>('/customers', token);
export const projectDirectory = (token: string) => allPages<Project>('/projects', token);
