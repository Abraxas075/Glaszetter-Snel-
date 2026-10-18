export interface JobMedia {
  id: string;
  jobId: string;
  kind: 'photo' | 'video';
  url: string;
  filename: string;
  caption: string;
  createdAt: string;
}
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
export function safeMediaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
