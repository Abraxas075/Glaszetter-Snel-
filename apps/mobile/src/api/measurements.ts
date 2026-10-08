import type { ElementType, Measurement, PaginatedResponse } from '@glaszetter/shared';
import { apiRequest } from './client';

export interface ParsedMeasurement {
  elementCode: string | null;
  location: string | null;
  elementType: ElementType | null;
  width: number | null;
  height: number | null;
  glassType: string | null;
  notes: string | null;
}

export const parseVoiceTranscript = (
  token: string,
  transcript: string
): Promise<ParsedMeasurement> =>
  apiRequest<ParsedMeasurement>('/measurements/parse-voice', {
    method: 'POST',
    token,
    body: JSON.stringify({ transcript }),
  });

// The API orders measurements newest first; resume the latest saved measurement.
export const getLatestMeasurement = async (token: string, elementId: string): Promise<Measurement> => {
  const result = await apiRequest<PaginatedResponse<Measurement>>(
    `/measurements?elementId=${encodeURIComponent(elementId)}&limit=1`, { token }
  );
  if (!result.data[0]) throw new Error('Dit element heeft nog geen opgeslagen meting.');
  return result.data[0];
};

export const updateMeasurement = (
  token: string,
  id: string,
  input: { width: number; height: number; glassType: string; notes: string }
): Promise<Measurement> =>
  apiRequest<Measurement>(`/measurements/${id}`, {
    method: 'PATCH', token, body: JSON.stringify(input),
  });
