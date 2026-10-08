import type { Element, ElementType, Measurement, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './client';

export const listElements = (
  token: string,
  jobId: string
): Promise<PaginatedResponse<Element>> =>
  apiRequest<PaginatedResponse<Element>>(`/elements?jobId=${jobId}&limit=100`, { token });

export const suggestNextCode = (
  token: string,
  jobId: string,
  prefix: string
): Promise<{ code: string }> =>
  apiRequest<{ code: string }>(
    `/elements/next-code?jobId=${jobId}&prefix=${encodeURIComponent(prefix)}`,
    { token }
  );

export interface CreateElementWithMeasurementInput {
  jobId: string;
  code: string;
  type: ElementType;
  location?: string;
  notes?: string;
  width: number;
  height: number;
  glassType?: string;
  measurementNotes?: string;
}

export const createElementWithMeasurement = (
  token: string,
  input: CreateElementWithMeasurementInput
): Promise<{ element: Element; measurement: Measurement }> =>
  apiRequest<{ element: Element; measurement: Measurement }>('/elements', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });

export const getElement = (token: string, id: string): Promise<Element> =>
  apiRequest<Element>(`/elements/${id}`, { token });

export const updateElement = (
  token: string,
  id: string,
  input: { code: string; type: ElementType; location: string }
): Promise<Element> =>
  apiRequest<Element>(`/elements/${id}`, {
    method: 'PATCH', token, body: JSON.stringify(input),
  });
