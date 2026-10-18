import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createThumbnailLoader } from '../apps/mobile/src/lib/thumbnailLoader';

test('thumbnail generation is bounded and duplicate requests share native work', async () => {
  const starts: string[] = [],
    releases: (() => void)[] = [];
  const load = createThumbnailLoader(async (url) => {
    starts.push(url);
    await new Promise<void>((resolve) => releases.push(resolve));
    return 'file://' + url;
  });
  const first = load('one'),
    same = load('one'),
    second = load('two'),
    third = load('three');
  assert.equal(first, same);
  await Promise.resolve();
  assert.deepEqual(starts, ['one', 'two']);
  releases.shift()!();
  assert.equal(await first, 'file://one');
  await Promise.resolve();
  assert.deepEqual(starts, ['one', 'two', 'three']);
  releases.shift()!();
  releases.shift()!();
  await Promise.all([second, third]);
  assert.equal(await load('one'), 'file://one');
  assert.equal(starts.length, 3);
});

test('unsupported video errors do not block later videos and can be retried', async () => {
  let attempts = 0;
  const load = createThumbnailLoader(async (url) => {
    if (url === 'bad' && attempts++ === 0) throw new Error('Cannot decode');
    return 'file://' + url;
  }, 1);
  const failing = load('bad'),
    next = load('good');
  await assert.rejects(failing, /decode/);
  assert.equal(await next, 'file://good');
  assert.equal(await load('bad'), 'file://bad');
});

test('thumbnail memory cache is bounded and expired local images can be regenerated', async () => {
  let calls = 0;
  const load = createThumbnailLoader(async (url) => 'file://' + url + '-' + ++calls, 1, 2);
  await load('one');
  await load('two');
  await load('three');
  assert.equal(calls, 3);
  await load('one');
  assert.equal(calls, 4);
  load.invalidate('one');
  assert.equal(await load('one'), 'file://one-5');
});
