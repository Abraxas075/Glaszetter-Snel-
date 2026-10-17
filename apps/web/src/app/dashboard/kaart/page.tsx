'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Route } from 'next';
import type { Project } from '@glaszetter/shared';
import { GoogleMapsActions } from '../../../components/GoogleMapsActions';
import {
  filterMapJobs,
  geocodeProject,
  groupMapPoints,
  loadMapJobs,
  type GeoLocation,
  type MapJob,
} from '../../../lib/jobMap';
import { JOB_STATUSES, JOB_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';
const JobMapCanvas = dynamic(() => import('../../../components/JobMapCanvas'), {
  ssr: false,
  loading: () => <p role="status">Kaart laden…</p>,
});

export default function JobMapPage() {
  const [jobs, setJobs] = useState<MapJob[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [locations, setLocations] = useState<Record<string, GeoLocation | null>>({});
  const [geoBusy, setGeoBusy] = useState(false),
    [geoError, setGeoError] = useState(false),
    [progress, setProgress] = useState(0);
  const [reload, setReload] = useState(0),
    [geoReload, setGeoReload] = useState(0);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [city, setCity] = useState('');
  const cache = useRef(new Map<string, GeoLocation | null>());
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setJobs([]);
    setLocations({});
    loadMapJobs()
      .then((data) => {
        if (active) setJobs(data);
      })
      .catch(() => {
        if (active) setError('Klussen en adressen laden is mislukt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    if (loading || error) return;
    const controller = new AbortController();
    let active = true;
    const projects = [
      ...new Map(
        jobs
          .filter((item) => item.destination && item.project?.city?.trim())
          .map((item) => [item.project!.id, item.project!])
      ).values(),
    ];
    setGeoBusy(true);
    setGeoError(false);
    setProgress(0);
    setLocations({});
    void (async () => {
      const result: Record<string, GeoLocation | null> = {};
      let consecutiveFailures = 0;
      // One request at a time and per-page cache avoid repeated address lookups for the same project.
      for (let i = 0; i < projects.length; i++) {
        if (controller.signal.aborted) return;
        const project: Project = projects[i];
        const key = `${project.address}|${project.city}`;
        try {
          if (!cache.current.has(key))
            cache.current.set(key, await geocodeProject(project, controller.signal));
          result[project.id] = cache.current.get(key) ?? null;
          consecutiveFailures = 0;
        } catch {
          if (controller.signal.aborted) return;
          result[project.id] = null;
          if (active) setGeoError(true);
          if (++consecutiveFailures >= 3) break;
        }
        if (active) setProgress(i + 1);
      }
      if (active) {
        setLocations(result);
        setGeoBusy(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [jobs, loading, error, geoReload]);
  const filtered = useMemo(
    () => filterMapJobs(jobs, search, status, city),
    [jobs, search, status, city]
  );
  const points = useMemo(() => groupMapPoints(filtered, locations), [filtered, locations]);
  const mapped = filtered.filter((item) => !!locations[item.project?.id ?? '']);
  const unmapped = filtered.filter((item) => !locations[item.project?.id ?? '']);
  const cities = [
    ...new Set(
      jobs.map((item) => item.project?.city?.trim()).filter((value): value is string => !!value)
    ),
  ].sort((a, b) => a.localeCompare(b, 'nl'));
  return (
    <div>
      <div style={pageStyles.headerRow}>
        <h1 style={pageStyles.title}>Klussen op de kaart</h1>
        <button
          type="button"
          className="sapphire-button sapphire-button-secondary"
          onClick={() => setReload((value) => value + 1)}
          disabled={loading || geoBusy}
        >
          Vernieuwen
        </button>
      </div>
      <p>
        Bekijk alle klussen en open een klus of een route in Google Maps. Blauwe markers tonen één
        klus; rode markers bevatten meerdere klussen op dezelfde locatie.
      </p>
      {loading && <p role="status">Alle klussen en adressen laden…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <>
          <div className="job-map-filters">
            <label>
              Zoeken
              <input
                style={formStyles.input}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Klus, project of adres"
              />
            </label>
            <label>
              Status
              <select
                style={formStyles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Alle statussen</option>
                {JOB_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {JOB_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Plaats
              <select
                style={formStyles.select}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Alle plaatsen</option>
                {cities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="sapphire-button sapphire-button-secondary"
              onClick={() => {
                setSearch('');
                setStatus('');
                setCity('');
              }}
            >
              Filters wissen
            </button>
          </div>
          <p role="status">
            {filtered.length} van {jobs.length} klussen
            {geoBusy
              ? ` — adressen plaatsen (${progress})…`
              : ` — ${mapped.length} op de kaart, ${unmapped.length} zonder kaartpositie`}
          </p>
          <JobMapCanvas points={points} />
          <p className="meetbon-description">
            Kaart: OpenStreetMap. Nederlandse adressen worden opgezocht via PDOK. Alleen straat en
            plaats worden hiervoor gebruikt. Zonder huisnummer tonen we een straatpositie.
          </p>
          {!geoBusy && (
            <button
              type="button"
              className="sapphire-button sapphire-button-secondary"
              onClick={() => {
                cache.current.clear();
                setGeoReload((value) => value + 1);
              }}
            >
              Adresposities opnieuw zoeken
            </button>
          )}
          {geoError && (
            <p role="alert">
              Een of meer adressen konden niet worden opgezocht. Probeer de adresposities opnieuw te
              zoeken; alle klussen blijven hieronder bereikbaar.
            </p>
          )}
          {!filtered.length && <p>Geen klussen voor deze filters.</p>}
          <h2>Klussen met kaartpositie</h2>
          <div className="job-map-list">
            {mapped.map((item) => (
              <article key={item.job.id} className="glass-panel urgent-card">
                <h3>
                  <Link href={`/dashboard/jobs/${item.job.id}` as Route}>{item.job.name}</Link>
                </h3>
                <p>
                  {JOB_STATUS_LABELS[item.job.status]} —{' '}
                  {locations[item.project!.id]?.precision === 'straat'
                    ? 'Straatniveau'
                    : 'Adresniveau'}
                </p>
                <GoogleMapsActions location={item.project} />
              </article>
            ))}
          </div>
          <h2>{geoBusy ? 'Klussen — posities worden opgezocht' : 'Klussen zonder kaartpositie'}</h2>
          <div className="job-map-list">
            {unmapped.map((item) => (
              <article key={item.job.id} className="glass-panel urgent-card">
                <h3>
                  <Link href={`/dashboard/jobs/${item.job.id}` as Route}>{item.job.name}</Link>
                </h3>
                <p>
                  {JOB_STATUS_LABELS[item.job.status]} —{' '}
                  {!item.destination
                    ? 'Geen straatadres ingevuld.'
                    : !item.project?.city?.trim()
                      ? 'Plaats ontbreekt.'
                      : geoBusy
                        ? 'Adres wordt opgezocht.'
                        : 'Geen eenduidige Nederlandse kaartpositie gevonden.'}
                </p>
                <GoogleMapsActions location={item.project} />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
