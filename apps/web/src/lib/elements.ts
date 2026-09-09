import type { Element, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './api';

export const listElements = (jobId: string, limit = 100): Promise<PaginatedResponse<Element>> =>
  apiRequest<PaginatedResponse<Element>>(`/elements?jobId=${jobId}&limit=${limit}`);
