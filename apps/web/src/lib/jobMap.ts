import type { Job, Project, PaginatedResponse } from '@glaszetter/shared';
import { mapDestination } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface GeoLocation {
  lat: number;
  lon: number;
  precision: 'adres' | 'straat';
  label: string;
}
export interface MapJob {
  job: Job;
  project?: Project;
  destination: string | null;
}
export interface MapPoint {
  location: GeoLocation;
  jobs: MapJob[];
}
type Request = <T>(path: string) => Promise<T>;
export async function loadMapJobs(request: Request = apiRequest): Promise<MapJob[]> {
  async function all<T extends { id: string }>(path: string) {
    const items = new Map<string, T>();
    let page = 1,
      totalPages = 1;
    do {
      const result = await request<PaginatedResponse<T>>(`${path}?limit=100&page=${page}`);
      if (result.page !== page || !Number.isInteger(result.totalPages) || result.totalPages < 0)
        throw new Error('Overzicht niet volledig geladen.');
      result.data.forEach((item) => items.set(item.id, item));
      totalPages = result.totalPages;
      page++;
    } while (page <= totalPages);
    return [...items.values()];
  }
  const [jobs, projects] = await Promise.all([all<Job>('/jobs'), all<Project>('/projects')]);
  const directory = new Map(projects.map((project) => [project.id, project]));
  return jobs.map((job) => {
    const project = directory.get(job.projectId);
    return { job, project, destination: mapDestination(project) };
  });
}
const normalize = (value: string) =>
  value.toLocaleLowerCase('nl-NL').replace(/[^\p{L}\p{N}]/gu, '');
interface PdokDoc {
  type?: string;
  straatnaam?: string;
  woonplaatsnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  centroide_ll?: string;
  weergavenaam?: string;
}
export function matchPdokLocation(
  project: Pick<Project, 'address' | 'city'>,
  docs: PdokDoc[]
): GeoLocation | null {
  if (!project.address?.trim() || !project.city?.trim()) return null;
  for (const doc of docs) {
    if (normalize(doc.woonplaatsnaam ?? '') !== normalize(project.city)) continue;
    const candidate =
      doc.type === 'adres'
        ? `${doc.straatnaam ?? ''}${doc.huisnummer ?? ''}${doc.huisletter ?? ''}${doc.huisnummertoevoeging ?? ''}`
        : doc.type === 'weg'
          ? (doc.straatnaam ?? '')
          : '';
    if (!candidate || normalize(candidate) !== normalize(project.address)) continue;
    const point = doc.centroide_ll?.match(/^POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/);
    if (!point) continue;
    const [, lon, lat] = point.map(Number);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < 50 ||
      lat > 54 ||
      lon < 3 ||
      lon > 8
    )
      continue;
    return {
      lat,
      lon,
      precision: doc.type === 'adres' ? 'adres' : 'straat',
      label: doc.weergavenaam ?? `${project.address}, ${project.city}`,
    };
  }
  return null;
}
export async function geocodeProject(
  project: Project,
  signal: AbortSignal
): Promise<GeoLocation | null> {
  if (!project.address?.trim() || !project.city?.trim()) return null;
  // Address and street are matched exactly; a similar address is never silently chosen.
  for (const type of ['adres', 'weg']) {
    if (type === 'adres' && !/\d/.test(project.address)) continue;
    const params = new URLSearchParams({
      q: `${project.address} ${project.city}`,
      fq: `type:${type}`,
      rows: '20',
      fl: 'type,straatnaam,woonplaatsnaam,huisnummer,huisletter,huisnummertoevoeging,centroide_ll,weergavenaam',
    });
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 12000);
    try {
      const result = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?${params}`,
        {
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'strict-origin-when-cross-origin',
        }
      );
      if (!result.ok) throw new Error('Adresdienst niet bereikbaar.');
      const data = (await result.json()) as { response?: { docs?: PdokDoc[] } };
      const location = matchPdokLocation(project, data.response?.docs ?? []);
      if (location) return location;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  return null;
}
export function groupMapPoints(
  jobs: MapJob[],
  locations: Record<string, GeoLocation | null>
): MapPoint[] {
  const points = new Map<string, MapPoint>();
  jobs.forEach((job) => {
    const location = locations[job.project?.id ?? ''];
    if (!location) return;
    const key = `${location.lat},${location.lon}`;
    const point = points.get(key) ?? { location, jobs: [] };
    point.jobs.push(job);
    points.set(key, point);
  });
  return [...points.values()];
}
export function filterMapJobs(jobs: MapJob[], search: string, status: string, city: string) {
  const query = search.trim().toLocaleLowerCase('nl-NL');
  return jobs.filter(
    (item) =>
      (!status || item.job.status === status) &&
      (!city || item.project?.city?.trim() === city) &&
      (!query ||
        [item.job.name, item.project?.name, item.destination]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('nl-NL')
          .includes(query))
  );
}
