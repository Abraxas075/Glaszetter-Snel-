import type { Photo } from '@glaszetter/shared';
import { apiRequest } from './api';

export const listPhotos = (filters: { jobId?: string; elementId?: string }): Promise<Photo[]> => {
  const params = new URLSearchParams();
  if (filters.jobId) params.set('jobId', filters.jobId);
  if (filters.elementId) params.set('elementId', filters.elementId);
  return apiRequest<Photo[]>(`/photos?${params.toString()}`);
};
