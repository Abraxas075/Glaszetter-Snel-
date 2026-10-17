import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { googleMapsLinks, meetbonMapLocation } from '../packages/shared/src/googleMaps';
import { GoogleMapsActions } from '../apps/web/src/components/GoogleMapsActions';
import { listAllProjects } from '../apps/web/src/lib/projects';

test('web Maps renders the exact Android destinations in a separate protected tab', () => {
  const location = { address: 'Jarmuiden 16', postalCode: '1046 AD', city: 'Amsterdam' };
  const html = renderToStaticMarkup(React.createElement(GoogleMapsActions, { location }));
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1].replaceAll('&amp;', '&')
  );
  const expected = googleMapsLinks(location)!;
  assert.deepEqual(links, [expected.map, expected.route]);
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.ok(html.includes('Route starten'));
  assert.ok(!html.includes('<button')); // A map link never submits a surrounding work form.
});
test('missing, loading and failed addresses never expose a stale map link', () => {
  for (const props of [
    { location: { city: 'Zaandam' } },
    { location: { address: 'Oud adres' }, loading: true },
    { location: { address: 'Oud adres' }, error: 'Adres laden is mislukt.', onRetry: () => {} },
  ]) {
    const html = renderToStaticMarkup(React.createElement(GoogleMapsActions, props));
    assert.ok(!html.includes('href='));
    if ('error' in props) {
      assert.ok(html.includes('role="alert"'));
      assert.ok(html.includes('type="button"'));
    }
  }
});
test('web meetbon uses the current whole form address or the project fallback without saving', () => {
  const project = { address: 'Projectstraat 10', city: 'Zaandam' };
  const fields = { street: 'Damrak 12', city: 'Amsterdam', postalCode: '' };
  for (const [input, expected] of [
    [fields, 'Damrak 12'],
    [{}, 'Projectstraat 10'],
  ] as const) {
    const location = meetbonMapLocation(input) ?? project;
    const html = renderToStaticMarkup(React.createElement(GoogleMapsActions, { location }));
    assert.ok(html.includes(expected));
  }
  assert.equal(fields.street, 'Damrak 12');
  const location = meetbonMapLocation({ city: 'Amsterdam' }) ?? project;
  assert.ok(
    !renderToStaticMarkup(React.createElement(GoogleMapsActions, { location })).includes('href=')
  );
});
test('project addresses after page 1 are loaded and failed pages do not return a partial directory', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      const page = new URL(url).searchParams.get('page');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            data: [{ id: `project-${page}`, address: `Straat ${page}`, city: 'Amsterdam' }],
            page: Number(page),
            totalPages: 2,
          },
        }),
        { status: 200 }
      );
    };
    assert.deepEqual(
      (await listAllProjects()).map((project) => project.id),
      ['project-1', 'project-2']
    );
    assert.equal(calls.length, 2);
    globalThis.fetch = async (input) => {
      if (String(input).includes('page=2')) throw new Error('offline');
      return new Response(
        JSON.stringify({
          success: true,
          data: { data: [{ id: 'first' }], page: 1, totalPages: 2 },
        }),
        { status: 200 }
      );
    };
    await assert.rejects(listAllProjects(), /offline/);
  } finally {
    globalThis.fetch = original;
  }
});
