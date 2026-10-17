import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import type { Job, Team } from '../packages/shared/src/types';
import type { Supplier } from '../packages/shared/src/suppliers';
import {
  amsterdamDay,
  planningMatches,
  buildDayRoutes,
  loadMapDirectory,
  locateMapDirectory,
  supplierLocationKey,
} from '../packages/shared/src/mapPlanning';
import { groupMapPoints, type MapPoint } from '../packages/shared/src/jobMap';
import { nativeMapHtml, mapJobMessage } from '../apps/mobile/src/utils/mapHtml';
const job = (id: string, teamId: string, date: string) =>
  ({
    id,
    teamId,
    projectId: 'p',
    name: id,
    scheduledDate: date,
    status: 'scheduled',
  }) as unknown as Job;
const teams = [
  { id: 't1', memberIds: ['roberto', 'justin'] },
  { id: 't2', memberIds: ['justin', 'obi'] },
] as Team[];
test('today and tomorrow follow Amsterdam calendar days across DST, midnight and year boundaries', () => {
  for (const [instant, today, tomorrow] of [
    ['2026-10-17T22:30:00Z', '2026-10-18', '2026-10-19'],
    ['2026-10-24T23:30:00Z', '2026-10-25', '2026-10-26'],
    ['2026-03-28T23:30:00Z', '2026-03-29', '2026-03-30'],
    ['2026-12-31T23:30:00Z', '2027-01-01', '2027-01-02'],
  ]) {
    assert.equal(amsterdamDay(new Date(instant)), today);
    assert.equal(amsterdamDay(new Date(instant), 1), tomorrow);
  }
  const now = new Date('2026-10-17T22:30Z');
  assert.ok(
    planningMatches(job('a', 't1', '2026-10-18T00:00:00.000Z'), 'roberto', teams, 'today', now)
  );
  assert.ok(!planningMatches(job('b', 't1', '2026-10-17'), 'roberto', teams, 'today', now));
  assert.ok(!planningMatches(job('c', 't1', ''), 'roberto', teams, 'tomorrow', now));
});
test('employee filter uses membership of the job team, including multiple teams and no-team jobs', () => {
  const items = [job('a', 't1', ''), job('b', 't2', ''), job('c', '', '')];
  assert.deepEqual(
    items.filter((j) => planningMatches(j, 'justin', teams, 'all')).map((j) => j.id),
    ['a', 'b']
  );
  assert.deepEqual(
    items.filter((j) => planningMatches(j, 'roberto', teams, 'all')).map((j) => j.id),
    ['a']
  );
  assert.equal(items.filter((j) => planningMatches(j, 'unknown', teams, 'all')).length, 0);
  assert.equal(items.filter((j) => planningMatches(j, '', teams, 'all')).length, 3);
});
test('routes preserve all stops and connect parts with at most three waypoints, including Unicode addresses', () => {
  const stops = Array.from({ length: 11 }, (_, i) => ({
    key: String(i),
    label: `Klus ${i}`,
    location: { address: `Straat ${i} & ½`, city: 'Zaandam' },
  }));
  const parts = buildDayRoutes(stops);
  assert.equal(parts.length, 3);
  const visited: string[] = [];
  let previous = '';
  for (const [index, part] of parts.entries()) {
    const url = new URL(part.url);
    assert.equal(url.hostname, 'www.google.com');
    assert.equal(url.searchParams.get('api'), '1');
    assert.equal(url.searchParams.get('travelmode'), 'driving');
    assert.equal(url.searchParams.get('origin'), index ? previous : null);
    const waypoints = url.searchParams.get('waypoints')?.split('|') ?? [];
    assert.ok(waypoints.length <= 3);
    visited.push(...waypoints, url.searchParams.get('destination')!);
    previous = url.searchParams.get('destination')!;
    assert.ok(part.url.length <= 2048);
  }
  assert.deepEqual(
    visited,
    stops.map((s) => `${s.location.address}, Zaandam, Nederland`)
  );
  const reversed = buildDayRoutes([...stops].reverse());
  assert.equal(new URL(reversed[0].url).searchParams.get('waypoints')?.split('|')[0], visited[10]);
  assert.equal(buildDayRoutes([stops[0], stops[0]]).flatMap((r) => r.stops).length, 1);
  assert.deepEqual(buildDayRoutes([]), []);
  assert.throws(() =>
    buildDayRoutes([{ key: 'empty', label: 'Empty', location: { city: 'Amsterdam' } }])
  );
  assert.throws(() =>
    buildDayRoutes([{ key: 'pipe', label: 'Pipe', location: { address: 'A|B' } }])
  );
  assert.throws(() =>
    buildDayRoutes([{ key: 'long', label: 'Long', location: { address: 'é'.repeat(2000) } }])
  );
});
test('supplier and job on one position are both retained using distinct location keys', () => {
  const supplier = {
    id: 'p',
    name: 'Vandaglas',
    address: 'Jarmuiden 16',
    city: 'Amsterdam',
  } as Supplier;
  const location = {
    lat: 52.39227671,
    lon: 4.79244689,
    precision: 'adres' as const,
    label: 'Jarmuiden 16',
  };
  const points = groupMapPoints(
    [{ job: job('a', 't1', ''), project: { id: 'p' } as never, destination: 'Jarmuiden 16' }],
    { p: location, [supplierLocationKey('p')]: location },
    [supplier]
  );
  assert.equal(points.length, 1);
  assert.equal(points[0].jobs.length, 1);
  assert.equal(points[0].suppliers?.[0].id, 'p');
});
test('failed optional employee or supplier directories do not erase jobs; job fetch failure stays fatal', async () => {
  const data = await loadMapDirectory(async <T>(path: string) => {
    if (path === '/teams' || path === '/users' || path === '/suppliers')
      throw new Error('directory down');
    return {
      page: 1,
      totalPages: 1,
      data: path.startsWith('/jobs')
        ? [job('a', 't1', '')]
        : [{ id: 'p', address: 'Singel', city: 'Amsterdam' }],
    } as T;
  });
  assert.equal(data.jobs.length, 1);
  assert.equal(data.warnings.length, 3);
  await assert.rejects(
    loadMapDirectory(async () => {
      throw new Error('offline');
    }),
    /offline/
  );
});
test('coordinate lookup caches shared addresses and stops promptly after repeated service failures', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const data = {
    jobs: Array.from({ length: 8 }, (_, i) => ({
      job: job(String(i), '', ''),
      project: { id: String(i), address: 'Singel', city: 'Amsterdam' } as never,
      destination: 'Singel',
    })),
    suppliers: [],
    teams: [],
    employees: [],
    warnings: [],
  };
  try {
    globalThis.fetch = async () => {
      calls++;
      return new Response(
        JSON.stringify({
          response: {
            docs: [
              {
                type: 'weg',
                straatnaam: 'Singel',
                woonplaatsnaam: 'Amsterdam',
                centroide_ll: 'POINT(4.8889 52.3725)',
              },
            ],
          },
        })
      );
    };
    const result = await locateMapDirectory(
      data,
      new AbortController().signal,
      () => {},
      new Map()
    );
    assert.equal(calls, 1);
    assert.equal(Object.keys(result.locations).length, 8);
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new Error('offline');
    };
    const failed = await locateMapDirectory(
      data,
      new AbortController().signal,
      () => {},
      new Map()
    );
    assert.equal(calls, 3);
    assert.equal(failed.failed, true);
    await assert.rejects(
      locateMapDirectory(data, AbortSignal.abort(), () => {}, new Map()),
      /afgebroken/
    );
  } finally {
    globalThis.fetch = original;
  }
});
test('native map escapes script-breaking names, omits project details and uses pinned Leaflet integrity', () => {
  const malicious = '</script><script>alert(1)</script>\u2028';
  const points = [
    {
      location: { lat: 52.4, lon: 4.8, precision: 'straat', label: malicious },
      jobs: [
        {
          job: { id: 'allowed', name: malicious, companyId: 'private-company' },
          project: { notes: 'private-notes' },
        },
      ],
      suppliers: [{ name: malicious, email: 'private-mail' }],
    },
  ] as unknown as MapPoint[];
  const html = nativeMapHtml(points);
  assert.ok(!html.includes(malicious));
  assert.ok(!html.includes('private-company'));
  assert.ok(!html.includes('private-notes'));
  assert.ok(!html.includes('private-mail'));
  const script = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(() => new Script(script));
  for (const file of ['leaflet.js', 'leaflet.css']) {
    const digest = createHash('sha256')
      .update(readFileSync(`node_modules/leaflet/dist/${file}`))
      .digest('base64');
    assert.ok(html.includes(`sha256-${digest}`));
  }
  assert.equal(mapJobMessage('{"type":"job","id":"allowed"}', ['allowed']), 'allowed');
  for (const raw of [
    '{"type":"job","id":"stale"}',
    '{"type":"job","id":"https://evil.example"}',
    '{"type":"route","id":"allowed"}',
    'not json',
    'null',
  ])
    assert.equal(mapJobMessage(raw, ['allowed']), null);
});
