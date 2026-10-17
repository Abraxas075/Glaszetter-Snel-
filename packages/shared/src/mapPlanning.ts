import type { Job, Team, User } from './types/index';
import type { Supplier } from './suppliers';
import type { MapLocation } from './googleMaps';
import { mapDestination } from './googleMaps';
import { loadMapJobs, geocodeProject, type MapJob, type GeoLocation } from './jobMap';
export type MapDay = 'all' | 'today' | 'tomorrow';
export interface RouteStop {
  key: string;
  label: string;
  location: MapLocation;
}
export interface MapDirectory {
  jobs: MapJob[];
  teams: Team[];
  employees: Pick<User, 'id' | 'name'>[];
  suppliers: Supplier[];
  warnings: string[];
}
export const supplierLocationKey = (id: string) => `supplier:${id}`;
export function amsterdamDay(now = new Date(), offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return new Date(Date.UTC(n('year'), n('month') - 1, n('day') + offset))
    .toISOString()
    .slice(0, 10);
}
export function planningMatches(
  job: Job,
  employeeId: string,
  teams: Team[],
  day: MapDay,
  now = new Date()
) {
  if (
    employeeId &&
    !teams.some((team) => team.id === job.teamId && team.memberIds.includes(employeeId))
  )
    return false;
  if (day === 'all') return true;
  const date =
    job.scheduledDate instanceof Date
      ? job.scheduledDate.toISOString()
      : String(job.scheduledDate ?? '');
  return date.slice(0, 10) === amsterdamDay(now, day === 'tomorrow' ? 1 : 0);
}
export async function loadMapDirectory(
  request: <T>(path: string) => Promise<T>
): Promise<MapDirectory> {
  const results = await Promise.allSettled([
    loadMapJobs(request),
    request<Team[]>('/teams'),
    request<Pick<User, 'id' | 'name'>[]>('/users'),
    request<Supplier[]>('/suppliers'),
  ]);
  if (results[0].status === 'rejected') throw results[0].reason;
  const warnings: string[] = [];
  function value<T>(index: number, label: string): T[] {
    const r = results[index];
    if (r.status === 'fulfilled') return r.value as T[];
    warnings.push(`${label} laden is mislukt.`);
    return [];
  }
  return {
    jobs: results[0].value,
    teams: value<Team>(1, 'Teams'),
    employees: value<Pick<User, 'id' | 'name'>>(2, 'Medewerkers'),
    suppliers: value<Supplier>(3, 'Leveranciers'),
    warnings,
  };
}
export async function locateMapDirectory(
  data: MapDirectory,
  signal: AbortSignal,
  progress: (count: number) => void,
  cache: Map<string, GeoLocation | null>
) {
  const locations: Record<string, GeoLocation | null> = {};
  let failed = false,
    failures = 0;
  const projects = [
    ...new Map(data.jobs.filter((j) => j.project).map((j) => [j.project!.id, j.project!])).values(),
  ];
  const targets = [
    ...projects.map((p) => ({ key: p.id, address: p.address, city: p.city })),
    ...data.suppliers.map((s) => ({
      key: supplierLocationKey(s.id),
      address: s.address ?? undefined,
      city: s.city ?? undefined,
    })),
  ];
  for (let i = 0; i < targets.length; i++) {
    if (signal.aborted) throw new Error('Adreszoeken afgebroken.');
    const target = targets[i],
      key = `${target.address ?? ''}|${target.city ?? ''}`;
    try {
      if (!cache.has(key)) cache.set(key, await geocodeProject(target, signal));
      locations[target.key] = cache.get(key) ?? null;
      failures = 0;
    } catch {
      if (signal.aborted) throw new Error('Adreszoeken afgebroken.');
      failed = true;
      if (++failures >= 3) break;
    }
    progress(i + 1);
  }
  return { locations, failed };
}
export function buildDayRoutes(stops: RouteStop[]) {
  const seen = new Set<string>();
  const destinations: string[] = [];
  for (const stop of stops) {
    const address = mapDestination(stop.location);
    if (!address || address.includes('|'))
      throw new Error('Een routestop heeft geen bruikbaar adres.');
    if (!seen.has(address.toLocaleLowerCase('nl-NL'))) {
      seen.add(address.toLocaleLowerCase('nl-NL'));
      destinations.push(address);
    }
  }
  const routes: { url: string; stops: string[] }[] = [];
  let at = 0;
  while (at < destinations.length) {
    let count = Math.min(4, destinations.length - at),
      url = '';
    while (count > 0) {
      const part = destinations.slice(at, at + count);
      const encode = (value: string) => {
        try {
          return encodeURIComponent(value);
        } catch {
          throw new Error('Een adres bevat ongeldige tekens.');
        }
      };
      url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encode(part[part.length - 1])}`;
      if (at > 0) url += `&origin=${encode(destinations[at - 1])}`;
      if (part.length > 1) url += `&waypoints=${encode(part.slice(0, -1).join('|'))}`;
      if (url.length <= 2048) break;
      count--;
    }
    if (!count) throw new Error('Een adres is te lang voor een Google Maps-route.');
    routes.push({ url, stops: destinations.slice(at, at + count) });
    at += count;
  }
  return routes;
}
