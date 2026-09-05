import type { ElementType } from '@glaszetter/shared';
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
