import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  amsterdamDay,
  buildDayRoutes,
  filterMapJobs,
  groupMapPoints,
  loadMapDirectory,
  locateMapDirectory,
  planningMatches,
  supplierLocationKey,
  type GeoLocation,
  type MapDay,
  type MapDirectory,
  type RouteStop,
} from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { SapphireScreen, sapphireStyles as s } from '../components/SapphireScreen';
import { GlassPanel } from '../components/GlassPanel';
import { GoogleMapsActions } from '../components/GoogleMapsActions';
import { nativeMapHtml, mapJobMessage } from '../utils/mapHtml';
const statuses: Record<string, string> = {
  concept: 'Concept',
  measuring: 'Inmeten',
  quote: 'Offerte',
  approved: 'Goedgekeurd',
  ordered: 'Besteld',
  delivery_expected: 'Levering verwacht',
  scheduled: 'Ingepland',
  in_progress: 'In uitvoering',
  completion: 'Oplevering',
  completed: 'Afgerond',
  invoiced: 'Gefactureerd',
};
function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8, marginVertical: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        style={s.action}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={s.actionText}>
          {label}: {options.find((o) => o.value === value)?.label ?? 'Alle'}
        </Text>
      </Pressable>
      {open && (
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              key={option.value}
              style={[
                s.action,
                { backgroundColor: option.value === value ? '#075da4' : '#16324d' },
              ]}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <Text style={s.actionText}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
export function JobMapScreen() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <ActivityIndicator />;
  if (!token) return <Redirect href="/login" />;
  return <MapContents key={token} token={token} />;
}
function MapContents({ token }: { token: string }) {
  const router = useRouter();
  const [directory, setDirectory] = useState<MapDirectory>({
    jobs: [],
    teams: [],
    employees: [],
    suppliers: [],
    warnings: [],
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0);
  const [locations, setLocations] = useState<Record<string, GeoLocation | null>>({}),
    [geoBusy, setGeoBusy] = useState(false),
    [geoError, setGeoError] = useState(false),
    [progress, setProgress] = useState(0),
    [geoReload, setGeoReload] = useState(0),
    [mapError, setMapError] = useState(false);
  const [employee, setEmployee] = useState(''),
    [day, setDay] = useState<MapDay>('all'),
    [city, setCity] = useState(''),
    [status, setStatus] = useState(''),
    [search, setSearch] = useState(''),
    [suppliersVisible, setSuppliersVisible] = useState(true);
  const [stops, setStops] = useState<RouteStop[]>([]),
    [now, setNow] = useState(() => new Date());
  const cache = useRef(new Map<string, GeoLocation | null>());
  const today = amsterdamDay(now),
    filterNow = useMemo(() => new Date(`${today}T12:00:00Z`), [today]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setStops([]), [day, employee, today]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDirectory({ jobs: [], teams: [], employees: [], suppliers: [], warnings: [] });
    setStops([]);
    loadMapDirectory(<T,>(path: string) => apiRequest<T>(path, { token }))
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
        if (active) setError('Kaartgegevens laden is mislukt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, token]);
  useEffect(() => {
    if (loading || error) return;
    let active = true;
    const controller = new AbortController();
    setGeoBusy(true);
    setGeoError(false);
    setLocations({});
    setProgress(0);
    locateMapDirectory(
      directory,
      controller.signal,
      (n) => {
        if (active) setProgress(n);
      },
      cache.current
    )
      .then((result) => {
        if (active) {
          setLocations(result.locations);
          setGeoError(result.failed);
          setGeoBusy(false);
        }
      })
      .catch(() => {
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
  const jobs = useMemo(
    () =>
      filterMapJobs(directory.jobs, search, status, city).filter((item) =>
        planningMatches(item.job, employee, directory.teams, day, filterNow)
      ),
    [directory, search, status, city, employee, day, filterNow]
  );
  const suppliers = useMemo(
    () =>
      suppliersVisible
        ? directory.suppliers.filter(
            (s) =>
              (!city || s.city?.trim() === city) &&
              (!search ||
                [s.name, s.address, s.city]
                  .join(' ')
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()))
          )
        : [],
    [directory.suppliers, suppliersVisible, city, search]
  );
  const points = useMemo(
    () => groupMapPoints(jobs, locations, suppliers),
    [jobs, locations, suppliers]
  );
  const html = useMemo(() => nativeMapHtml(points), [points]);
  const cities = [
    ...new Set(
      [
        ...directory.jobs.map((j) => j.project?.city?.trim()),
        ...directory.suppliers.map((s) => s.city?.trim()),
      ].filter((v): v is string => !!v)
    ),
  ].sort();
  let routes: ReturnType<typeof buildDayRoutes> = [],
    routeError = '';
  try {
    routes = buildDayRoutes(stops);
  } catch (err) {
    routeError = (err as Error).message;
  }
  const add = (stop: RouteStop) =>
    setStops((current) => (current.some((s) => s.key === stop.key) ? current : [...current, stop]));
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Route niet geopend', 'Controleer je verbinding en probeer opnieuw.');
    }
  }
  function move(index: number, offset: number) {
    const next = [...stops];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setStops(next);
  }
  return (
    <SapphireScreen title="Kaart en dagroute">
      <Pressable
        accessibilityRole="button"
        disabled={loading || geoBusy}
        style={s.action}
        onPress={() => setReload((v) => v + 1)}
      >
        <Text style={s.actionText}>Vernieuwen</Text>
      </Pressable>
      {loading && <ActivityIndicator />}
      {!!error && (
        <Text accessibilityRole="alert" style={s.text}>
          {error}
        </Text>
      )}
      {!loading && !error && (
        <>
          <TextInput
            accessibilityLabel="Zoeken op klus, project of adres"
            placeholder="Zoeken op klus, project of adres"
            placeholderTextColor="#B9CEDF"
            value={search}
            onChangeText={setSearch}
            style={{
              color: 'white',
              borderColor: '#00A0E6',
              borderWidth: 1,
              padding: 12,
              marginVertical: 12,
            }}
          />
          <Choice
            label="Medewerker via team"
            value={employee}
            options={[
              { value: '', label: 'Alle medewerkers' },
              ...directory.employees.map((u) => ({ value: u.id, label: u.name })),
            ]}
            onChange={setEmployee}
            disabled={directory.warnings.some(
              (w) => w.startsWith('Teams') || w.startsWith('Medewerkers')
            )}
          />
          <Choice
            label="Dag"
            value={day}
            options={[
              { value: 'all', label: 'Alle dagen' },
              { value: 'today', label: 'Vandaag' },
              { value: 'tomorrow', label: 'Morgen' },
            ]}
            onChange={(value) => setDay(value as MapDay)}
          />
          <Choice
            label="Plaats"
            value={city}
            options={[
              { value: '', label: 'Alle plaatsen' },
              ...cities.map((c) => ({ value: c, label: c })),
            ]}
            onChange={setCity}
          />
          <Choice
            label="Status"
            value={status}
            options={[
              { value: '', label: 'Alle statussen' },
              ...Object.entries(statuses).map(([value, label]) => ({ value, label })),
            ]}
            onChange={setStatus}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: suppliersVisible }}
            style={s.action}
            onPress={() => setSuppliersVisible((v) => !v)}
          >
            <Text style={s.actionText}>{suppliersVisible ? '✓ ' : ''}Leveranciers tonen</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[s.action, { marginVertical: 8 }]}
            onPress={() => {
              setEmployee('');
              setDay('all');
              setCity('');
              setStatus('');
              setSearch('');
            }}
          >
            <Text style={s.actionText}>Filters wissen</Text>
          </Pressable>
          {directory.warnings.map((w) => (
            <Text key={w} style={s.text} accessibilityRole="alert">
              {w} Kies Vernieuwen.
            </Text>
          ))}
          <Text style={s.muted}>
            Medewerkers volgen het toegewezen team. Vandaag en morgen volgen de Nederlandse datum.
            Blauw: klus. Rood: meerdere klussen. Groen: leverancier. Paars: combinatie.
          </Text>
          <Text style={s.text}>
            {jobs.length} van {directory.jobs.length} klussen —{' '}
            {geoBusy ? `Adressen plaatsen (${progress})…` : `${points.length} kaartposities`}
          </Text>
          <View style={{ height: 380, marginVertical: 12 }}>
            <WebView
              source={{ html, baseUrl: 'https://glaszetter-snel-web.vercel.app/' }}
              originWhitelist={['*']}
              javaScriptEnabled
              allowFileAccess={false}
              allowUniversalAccessFromFileURLs={false}
              mixedContentMode="never"
              javaScriptCanOpenWindowsAutomatically={false}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url === 'https://www.openstreetmap.org/copyright') {
                  void open(request.url);
                  return false;
                }
                return (
                  request.url === 'about:blank' ||
                  request.url === 'https://glaszetter-snel-web.vercel.app/'
                );
              }}
              onError={() => setMapError(true)}
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);
                  if (message.type === 'error') setMapError(true);
                  const id = mapJobMessage(
                    event.nativeEvent.data,
                    jobs.map((j) => j.job.id)
                  );
                  if (id) router.push(`/jobs/${id}/elements`);
                } catch {}
              }}
            />
          </View>
          {(mapError || geoError) && (
            <Text style={s.text} accessibilityRole="alert">
              Een kaart of adres kon niet volledig laden. Je kunt de klussen en Google Maps-routes
              hieronder gebruiken.
            </Text>
          )}
          {!geoBusy && (
            <Pressable
              accessibilityRole="button"
              style={s.action}
              onPress={() => {
                cache.current.clear();
                setMapError(false);
                setGeoReload((v) => v + 1);
              }}
            >
              <Text style={s.actionText}>Adresposities opnieuw zoeken</Text>
            </Pressable>
          )}
          <Text style={s.muted}>
            Kaart: © OpenStreetMap contributors. Adreszoeken: PDOK. Alleen straat en plaats worden
            opgezocht; zonder huisnummer tonen we straatniveau.
          </Text>
          <GlassPanel style={s.card}>
            <Text style={s.title}>Dagroute</Text>
            <Text style={s.muted}>
              {day === 'all'
                ? 'Kies Vandaag of Morgen en voeg klussen of leveranciers toe.'
                : 'Pas de stopvolgorde aan. De eerste route begint vanaf je locatie in Google Maps.'}
            </Text>
            {stops.map((stop, index) => (
              <View key={stop.key} style={{ gap: 6 }}>
                <Text style={s.text}>
                  {index + 1}. {stop.label}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${stop.label} omhoog`}
                    disabled={!index}
                    style={s.action}
                    onPress={() => move(index, -1)}
                  >
                    <Text style={s.actionText}>Omhoog</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${stop.label} omlaag`}
                    disabled={index === stops.length - 1}
                    style={s.action}
                    onPress={() => move(index, 1)}
                  >
                    <Text style={s.actionText}>Omlaag</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${stop.label} uit route verwijderen`}
                    style={s.action}
                    onPress={() => setStops((current) => current.filter((s) => s.key !== stop.key))}
                  >
                    <Text style={s.actionText}>Verwijderen</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {!!routeError && <Text style={s.text}>{routeError}</Text>}
            {routes.map((route, index) => (
              <Pressable
                key={index}
                accessibilityRole="link"
                style={s.action}
                onPress={() => void open(route.url)}
              >
                <Text style={s.actionText}>
                  {routes.length === 1
                    ? 'Dagroute openen in Google Maps'
                    : `Routedeel ${index + 1} openen (${route.stops.length} stops)`}
                </Text>
              </Pressable>
            ))}
            {routes.length > 1 && (
              <Text style={s.muted}>
                Open de delen op volgorde; elk volgend deel begint bij de laatste stop van het
                vorige deel. Gelijke adressen worden één keer bezocht.
              </Text>
            )}
            {!!stops.length && (
              <Pressable accessibilityRole="button" style={s.action} onPress={() => setStops([])}>
                <Text style={s.actionText}>Route wissen</Text>
              </Pressable>
            )}
          </GlassPanel>
          <Text style={s.title}>Leveranciers ({suppliers.length})</Text>
          {suppliers.map((supplier) => (
            <GlassPanel key={supplier.id} style={s.card}>
              <Text style={s.title}>{supplier.name}</Text>
              <Text style={s.muted}>
                {locations[supplierLocationKey(supplier.id)]
                  ? 'Op de kaart'
                  : 'Geen kaartpositie gevonden'}
              </Text>
              <GoogleMapsActions location={supplier} dark />
              <Pressable
                accessibilityRole="button"
                disabled={
                  day === 'all' ||
                  !supplier.address?.trim() ||
                  stops.some((s) => s.key === supplierLocationKey(supplier.id))
                }
                style={s.action}
                onPress={() =>
                  add({
                    key: supplierLocationKey(supplier.id),
                    label: supplier.name,
                    location: supplier,
                  })
                }
              >
                <Text style={s.actionText}>Aan dagroute toevoegen</Text>
              </Pressable>
            </GlassPanel>
          ))}
          <Text style={s.title}>Klussen ({jobs.length})</Text>
          {!jobs.length && <Text style={s.text}>Geen klussen voor deze filters.</Text>}
          {jobs.map((item) => (
            <GlassPanel key={item.job.id} style={s.card}>
              <Pressable
                accessibilityRole="button"
                style={s.action}
                onPress={() => router.push(`/jobs/${item.job.id}/elements`)}
              >
                <Text style={s.actionText}>{item.job.name}</Text>
              </Pressable>
              <Text style={s.muted}>
                {statuses[item.job.status]} —{' '}
                {locations[item.project?.id ?? '']?.precision === 'straat'
                  ? 'Straatniveau'
                  : locations[item.project?.id ?? '']
                    ? 'Adresniveau'
                    : geoBusy
                      ? 'Adres wordt opgezocht'
                      : 'Geen kaartpositie'}
              </Text>
              <GoogleMapsActions location={item.project} dark />
              <Pressable
                accessibilityRole="button"
                disabled={
                  day === 'all' || !item.destination || stops.some((s) => s.key === item.job.id)
                }
                style={s.action}
                onPress={() =>
                  add({ key: item.job.id, label: item.job.name, location: item.project! })
                }
              >
                <Text style={s.actionText}>Aan dagroute toevoegen</Text>
              </Pressable>
            </GlassPanel>
          ))}
        </>
      )}
    </SapphireScreen>
  );
}
