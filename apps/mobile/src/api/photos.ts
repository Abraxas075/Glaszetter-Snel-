import { Platform } from 'react-native';
import type { Photo } from '@glaszetter/shared';
import { apiRequest } from './client';

export const listPhotos = (
  token: string,
  filters: { jobId?: string; elementId?: string }
): Promise<Photo[]> => {
  const params = new URLSearchParams();
  if (filters.jobId) params.set('jobId', filters.jobId);
  if (filters.elementId) params.set('elementId', filters.elementId);
  return apiRequest<Photo[]>(`/photos?${params.toString()}`, { token });
};

export interface PickedPhoto {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const uploadPhoto = async (
  token: string,
  photo: PickedPhoto,
  target: { jobId?: string; elementId?: string }
): Promise<Photo> => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // Web's fetch/FormData needs a real Blob - the RN-only { uri, name, type }
    // shape below silently produces an empty/invalid part on web (the image
    // picker's uri here is a blob: URL, so this fetch stays local, no network
    // round-trip to a real server).
    const blob = await (await fetch(photo.uri)).blob();
    formData.append('photo', blob, photo.fileName);
  } else {
    // React Native's fetch accepts this { uri, name, type } shape for file parts.
    formData.append('photo', {
      uri: photo.uri,
      name: photo.fileName,
      type: photo.mimeType,
    } as unknown as Blob);
  }

  if (target.jobId) formData.append('jobId', target.jobId);
  if (target.elementId) formData.append('elementId', target.elementId);

  return apiRequest<Photo>('/photos', {
    method: 'POST',
    token,
    body: formData,
  });
};

export const deletePhoto = (token: string, id: string): Promise<void> =>
  apiRequest<void>(`/photos/${id}`, { method: 'DELETE', token });
