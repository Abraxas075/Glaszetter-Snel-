'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Route } from 'next';
import {
  loadMapDirectory,
  locateMapDirectory,
  planningMatches,
  amsterdamDay,
  supplierLocationKey,
  type MapDirectory,
  type RouteStop,
  type MapDay,
} from '@glaszetter/shared';
import { apiRequest } from '../../../lib/api';
import { DayRoute } from '../../../components/DayRoute';
import { GoogleMapsActions } from '../../../components/GoogleMapsActions';
import { filterMapJobs, groupMapPoints, type GeoLocation } from '../../../lib/jobMap';
import { JOB_STATUSES, JOB_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';
const JobMapCanvas = dynamic(() => import('../../../components/JobMapCanvas'), {
  ssr: false,
  loading: () => <p role="status">Kaart laden…</p>,
});

export default function JobMapPage() {
  const [directory, setDirectory] = useState<MapDirectory>({
    jobs: [],
    teams: [],
    employees: [],
    suppliers: [],
    warnings: [],
  });
  const jobs = directory.jobs;
  const [employee, setEmployee] = useState(''),
    [day, setDay] = useState<MapDay>('all'),
    [showSuppliers, setShowSuppliers] = useState(true);
  const [stops, setStops] = useState<RouteStop[]>([]),
    [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const todayKey = amsterdamDay(now);
  const filterNow = useMemo(() => new Date(`${todayKey}T12:00:00Z`), [todayKey]);
  const dateKey = amsterdamDay(filterNow, day === 'tomorrow' ? 1 : 0);
  useEffect(() => setStops([]), [dateKey, day, employee]);
  const [loading, setLoading] = useState(true),
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
    setDirectory({ jobs: [], teams: [], employees: [], suppliers: [], warnings: [] });
    setStops([]);
    setLocations({});
    loadMapDirectory(apiRequest)
      .then((data) => {
        if (active) {
          setDirectory(data);
          setEmployee((current) =>
            data.employees.some((user) => user.id === current) &&
            !data.warnings.some((w) => w.startsWith('Teams'))
              ? current
              : ''
          );
        }
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
    setGeoBusy(true);
    setGeoError(false);
    setProgress(0);
    setLocations({});
    void (async () => {
      const result = await locateMapDirectory(
        directory,
        controller.signal,
        (count) => {
          if (active) setProgress(count);
        },
        cache.current
      );
      if (active) {
        setLocations(result.locations);
        setGeoError(result.failed);
        setGeoBusy(false);
      }
    })().catch(() => {
      if (active && !controller.signal.aborted) {
        setGeoError(true);
        setGeoBusy(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [directory, loading, error, geoReload]);
  const filtered = useMemo(
    () =>
      filterMapJobs(jobs, search, status, city).filter((item) =>
        planningMatches(item.job, employee, directory.teams, day, filterNow)
      ),
    [jobs, search, status, city, employee, directory.teams, day, filterNow]
  );
  const vendors = useMemo(
    () =>
      showSuppliers
        ? directory.suppliers.filter(
            (supplier) =>
              (!city || supplier.city?.trim() === city) &&
              (!search ||
                [supplier.name, supplier.address, supplier.city]
                  .join(' ')
                  .toLocaleLowerCase('nl-NL')
                  .includes(search.trim().toLocaleLowerCase('nl-NL')))
          )
        : [],
    [showSuppliers, directory.suppliers, city, search]
  );
  const points = useMemo(
    () => groupMapPoints(filtered, locations, vendors),
    [filtered, locations, vendors]
  );
  function addStop(stop: RouteStop) {
    setStops((current) =>
      current.some((item) => item.key === stop.key) ? current : [...current, stop]
    );
  }
  const mapped = filtered.filter((item) => !!locations[item.project?.id ?? '']);
  const unmapped = filtered.filter((item) => !locations[item.project?.id ?? '']);
  const cities = [
    ...new Set(
      [
        ...jobs.map((item) => item.project?.city?.trim()),
        ...directory.suppliers.map((supplier) => supplier.city?.trim()),
      ].filter((value): value is string => !!value)
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
        klus; rode markers bevatten meerdere klussen. Groen toont leveranciers, paars een
        combinatie.
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
            <label>
              Medewerker (via team)
              <select
                style={formStyles.select}
                value={employee}
                disabled={directory.warnings.some(
                  (w) => w.startsWith('Teams') || w.startsWith('Medewerkers')
                )}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">Alle medewerkers</option>
                {directory.employees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dag
              <select
                style={formStyles.select}
                value={day}
                onChange={(e) => setDay(e.target.value as MapDay)}
              >
                <option value="all">Alle dagen</option>
                <option value="today">Vandaag</option>
                <option value="tomorrow">Morgen</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showSuppliers}
                onChange={(e) => setShowSuppliers(e.target.checked)}
              />{' '}
              Leveranciers tonen
            </label>
            <button
              type="button"
              className="sapphire-button sapphire-button-secondary"
              onClick={() => {
                setSearch('');
                setStatus('');
                setCity('');
                setEmployee('');
                setDay('all');
              }}
            >
              Filters wissen
            </button>
          </div>
          {directory.warnings.map((warning) => (
            <p key={warning} role="alert">
              {warning} Kies Vernieuwen om opnieuw te laden.
            </p>
          ))}
          <p>
            Medewerkers worden gefilterd via het toegewezen team. Vandaag en morgen volgen de tijd
            in Nederland.
          </p>
          <p role="status">
            {filtered.length} van {jobs.length} klussen
            {geoBusy
              ? ` — adressen plaatsen (${progress})…`
              : ` — ${mapped.length} op de kaart, ${unmapped.length} zonder kaartpositie`}
          </p>
          <JobMapCanvas points={points} />
          <DayRoute stops={stops} onChange={setStops} enabled={day !== 'all'} />
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
          {showSuppliers && (
            <>
              <h2>Leveranciers ({vendors.length})</h2>
              <div className="job-map-list">
                {vendors.map((supplier) => (
                  <article key={supplier.id} className="glass-panel urgent-card">
                    <h3>{supplier.name}</h3>
                    <p>
                      {locations[supplierLocationKey(supplier.id)]
                        ? 'Op de kaart'
                        : 'Geen kaartpositie gevonden'}
                    </p>
                    <GoogleMapsActions location={supplier} />
                    <button
                      type="button"
                      className="sapphire-button sapphire-button-secondary"
                      disabled={
                        day === 'all' ||
                        !supplier.address?.trim() ||
                        stops.some((stop) => stop.key === supplierLocationKey(supplier.id))
                      }
                      onClick={() =>
                        addStop({
                          key: supplierLocationKey(supplier.id),
                          label: supplier.name,
                          location: supplier,
                        })
                      }
                    >
                      Aan dagroute toevoegen
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

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
                <button
                  type="button"
                  className="sapphire-button sapphire-button-secondary"
                  disabled={
                    day === 'all' ||
                    !item.destination ||
                    stops.some((stop) => stop.key === item.job.id)
                  }
                  onClick={() =>
                    addStop({ key: item.job.id, label: item.job.name, location: item.project! })
                  }
                >
                  Aan dagroute toevoegen
                </button>
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
                <button
                  type="button"
                  className="sapphire-button sapphire-button-secondary"
                  disabled={
                    day === 'all' ||
                    !item.destination ||
                    stops.some((stop) => stop.key === item.job.id)
                  }
                  onClick={() =>
                    addStop({ key: item.job.id, label: item.job.name, location: item.project! })
                  }
                >
                  Aan dagroute toevoegen
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
