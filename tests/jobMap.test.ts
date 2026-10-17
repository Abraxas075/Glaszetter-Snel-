import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Job, Project } from '../packages/shared/src/types';
import {
  loadMapJobs,
  matchPdokLocation,
  filterMapJobs,
  groupMapPoints,
  geocodeProject,
  type MapJob,
} from '../apps/web/src/lib/jobMap';
const project = { id: 'p1', address: 'Singel', city: 'Amsterdam' } as Project;
const job = { id: 'j1', projectId: 'p1', name: 'Ruit vervangen', status: 'scheduled' } as Job;
const street = {
  type: 'weg',
  straatnaam: 'Singel',
  woonplaatsnaam: 'Amsterdam',
  centroide_ll: 'POINT(4.88891228 52.37256897)',
};
test('all jobs and projects across pages are joined without mixing missing project addresses', async () => {
  const result = await loadMapJobs(async <T>(path: string) => {
    const page = Number(new URL(path, 'https://local').searchParams.get('page'));
    const data = path.startsWith('/jobs')
      ? page === 1
        ? [job]
        : [
            { ...job, id: 'j2', projectId: 'p2' },
            { ...job, id: 'j3', projectId: 'absent' },
          ]
      : page === 1
        ? [project]
        : [{ ...project, id: 'p2', address: 'Dam', city: 'Zaandam' }];
    return { data, page, totalPages: 2 } as T;
  });
  assert.equal(result.length, 3);
  assert.equal(result[1].destination, 'Dam, Zaandam, Nederland');
  assert.equal(result[2].destination, null);
  await assert.rejects(
    loadMapJobs(async () => {
      throw new Error('offline');
    }),
    /offline/
  );
  await assert.rejects(
    loadMapJobs(async <T>() => ({ data: [], page: 0, totalPages: 2 }) as T),
    /niet volledig/
  );
});
test('street-only input uses a street centroid and never an arbitrary house', () => {
  const location = matchPdokLocation(project, [
    { ...street, type: 'adres', huisnummer: 1 },
    street,
  ]);
  assert.equal(location?.precision, 'straat');
  assert.equal(location?.lat, 52.37256897);
  assert.equal(location?.lon, 4.88891228);
  assert.equal(matchPdokLocation(project, [{ ...street, type: 'adres', huisnummer: 1 }]), null);
});
test('exact street, number and city must match; wrong houses and invalid coordinates are rejected', () => {
  const location = { ...project, address: 'Jarmuiden 16' };
  const doc = { ...street, type: 'adres', straatnaam: 'Jarmuiden', huisnummer: 16 };
  assert.equal(matchPdokLocation(location, [doc])?.precision, 'adres');
  for (const bad of [
    { ...doc, huisnummer: 18 },
    { ...doc, woonplaatsnaam: 'Zaandam' },
    { ...doc, straatnaam: 'Jarmuiderweg' },
    { ...doc, centroide_ll: 'POINT(52.39 4.79)' },
    { ...doc, centroide_ll: 'POINT(NaN NaN)' },
    { ...doc, centroide_ll: 'POINT(180 90)' },
  ])
    assert.equal(matchPdokLocation(location, [bad]), null);
  assert.equal(matchPdokLocation({ ...project, city: '' }, [street]), null);
});
test('jobs at the same point are grouped and filters preserve list/marker counts', () => {
  const jobs: MapJob[] = [
    { job, project, destination: 'Singel Amsterdam' },
    { job: { ...job, id: 'j2', status: 'completed' }, project, destination: 'Singel Amsterdam' },
    { job: { ...job, id: 'j3' }, destination: null },
  ];
  const location = matchPdokLocation(project, [street])!;
  const points = groupMapPoints(jobs, { p1: location });
  assert.equal(points.length, 1);
  assert.equal(points[0].jobs.length, 2);
  assert.equal(filterMapJobs(jobs, 'SINGEL', 'scheduled', 'Amsterdam').length, 1);
  assert.equal(filterMapJobs(jobs, '', '', '').length, 3);
  assert.equal(filterMapJobs(jobs, '', '', 'Zaandam').length, 0);
});
test('geocoding sends only an address query without login credentials and can be cancelled', async () => {
  const original = globalThis.fetch;
  const calls: URL[] = [];
  try {
    globalThis.fetch = async (input, options) => {
      const url = new URL(String(input));
      calls.push(url);
      assert.equal(url.hostname, 'api.pdok.nl');
      assert.equal(options?.credentials, 'omit');
      assert.equal(options?.headers, undefined);
      assert.equal(url.searchParams.get('q'), 'Singel Amsterdam');
      assert.equal(url.searchParams.get('fq'), 'type:weg');
      return new Response(JSON.stringify({ response: { docs: [street] } }), { status: 200 });
    };
    assert.equal(
      (await geocodeProject(project, new AbortController().signal))?.precision,
      'straat'
    );
    assert.equal(calls.length, 1);
    globalThis.fetch = async (_input, options) => {
      assert.equal(options?.signal?.aborted, true);
      throw new DOMException('Aborted', 'AbortError');
    };
    await assert.rejects(geocodeProject(project, AbortSignal.abort()), { name: 'AbortError' });
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(geocodeProject(project, new AbortController().signal), /niet bereikbaar/);
  } finally {
    globalThis.fetch = original;
  }
});
