import type { MapLocation } from '@glaszetter/shared';
export {
  mapDestination,
  googleMapsLinks,
  meetbonMapLocation,
  type MapLocation,
} from '@glaszetter/shared';

export async function loadJobLocation(
  jobId: string,
  request: <T>(path: string) => Promise<T>
): Promise<MapLocation> {
  const job = await request<{ projectId: string }>(`/jobs/${encodeURIComponent(jobId)}`);
  return request<MapLocation>(`/projects/${encodeURIComponent(job.projectId)}`);
}
