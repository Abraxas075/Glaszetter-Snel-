import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  googleMapsLinks,
  mapDestination,
  meetbonMapLocation,
  loadJobLocation,
} from '../apps/mobile/src/utils/googleMaps';

test('supplier addresses open the exact destination in Maps and driving directions', () => {
  for (const [address, postalCode, city] of [
    ['Ingenieur Lelyweg 46', '2031 CD', 'Haarlem'],
    ['Wijkermeerweg 36', '1948 NW', 'Beverwijk'],
    ['Jarmuiden 16', '1046 AD', 'Amsterdam'],
  ]) {
    const location = { address, postalCode, city };
    const links = googleMapsLinks(location)!;
    const map = new URL(links.map),
      route = new URL(links.route);
    assert.equal(map.hostname, 'www.google.com');
    assert.equal(map.searchParams.get('api'), '1');
    assert.equal(map.searchParams.get('query'), `${address}, ${postalCode}, ${city}, Nederland`);
    assert.equal(route.searchParams.get('destination'), map.searchParams.get('query'));
    assert.equal(route.searchParams.get('travelmode'), 'driving');
    assert.equal(route.searchParams.has('origin'), false);
    assert.equal(route.searchParams.has('key'), false);
  }
});
test('missing, whitespace and city-only addresses do not produce links', () => {
  for (const value of [
    undefined,
    null,
    {},
    { city: 'Amsterdam' },
    { address: ' \n ', postalCode: '1046 AD' },
  ]) {
    assert.equal(googleMapsLinks(value), null);
  }
});
test('addresses are normalized without losing house numbers or foreign countries', () => {
  assert.equal(
    mapDestination({
      address: '  Markt  10A\n',
      postalCode: '2000',
      city: 'Antwerpen',
      country: 'België',
    }),
    'Markt 10A, 2000, Antwerpen, België'
  );
});
test('special characters cannot inject URL parameters or change the Maps host', () => {
  const location = {
    address: "'s-Gravenstraat 2 & 4/#?",
    city: 'Zaandam &destination=ander-adres',
  };
  const route = new URL(googleMapsLinks(location)!.route);
  assert.equal(route.searchParams.get('destination'), mapDestination(location));
  assert.deepEqual([...route.searchParams.keys()], ['api', 'destination', 'travelmode']);
  assert.equal(googleMapsLinks({ address: 'x'.repeat(2100) }), null);
  assert.equal(googleMapsLinks({ address: '\uD800' }), null);
});
test('current meetbon input overrides the project as a whole, even before saving', () => {
  const fields = { street: 'Damrak 12', city: 'Amsterdam', postalCode: '1012 LG' };
  const original = structuredClone(fields);
  assert.deepEqual(meetbonMapLocation(fields), {
    address: 'Damrak 12',
    city: 'Amsterdam',
    postalCode: '1012 LG',
  });
  assert.deepEqual(fields, original);
  assert.equal(meetbonMapLocation({ street: '  ', city: '', postalCode: '' }), undefined);
  const partial = meetbonMapLocation({ city: 'Zaandam' });
  assert.ok(partial); // No silent fallback to the old project address while editing.
  assert.equal(googleMapsLinks(partial), null);
});
test('job and measurement screens resolve the project belonging to the selected job', async () => {
  const calls: string[] = [];
  const project = { address: 'Singel', city: 'Amsterdam' };
  const result = await loadJobLocation('job/amsterdam', async <T>(path: string) => {
    calls.push(path);
    return (path.startsWith('/jobs/') ? { projectId: 'project/amsterdam' } : project) as T;
  });
  assert.deepEqual(calls, ['/jobs/job%2Famsterdam', '/projects/project%2Famsterdam']);
  assert.deepEqual(result, project);
});
test('failed job or project requests propagate instead of using another location', async () => {
  let calls = 0;
  await assert.rejects(
    loadJobLocation('job', async () => {
      calls++;
      throw new Error('offline');
    }),
    /offline/
  );
  assert.equal(calls, 1);
  await assert.rejects(
    loadJobLocation('job', async <T>(path: string) => {
      if (path.startsWith('/projects/')) throw new Error('forbidden');
      return { projectId: 'private-project' } as T;
    }),
    /forbidden/
  );
});
