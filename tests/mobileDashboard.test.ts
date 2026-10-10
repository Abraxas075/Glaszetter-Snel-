import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayRange, localDateKey, scheduledDateKey } from '../apps/mobile/src/utils/dayRange';
import { todayJobCount, customerDirectory } from '../apps/mobile/src/api/dashboard';

test('DATE filters retain the local calendar day across timezones, DST and month boundaries', () => {
  const old = process.env.TZ;
  try {
    for (const zone of ['Europe/Amsterdam', 'America/Los_Angeles', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      for (const date of ['2026-03-29', '2026-10-25', '2026-10-31']) {
        const now = new Date(`${date}T00:30:00`);
        assert.deepEqual(dayRange(now), { from: date, to: date });
        assert.equal(localDateKey(now), date);
        assert.equal(scheduledDateKey(`${date}T00:00:00.000Z`), date);
      }
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('day card uses server total and assigned-team/date filters rather than first-page length', async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get('mine'), 'true');
      assert.equal(parsed.searchParams.get('limit'), '1');
      assert.equal(parsed.searchParams.get('scheduledFrom'), localDateKey());
      assert.equal(parsed.searchParams.get('scheduledTo'), localDateKey());
      assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer test-token');
      return new Response(
        JSON.stringify({
          success: true,
          data: { data: [{}], total: 123, page: 1, limit: 1, totalPages: 123 },
        })
      );
    };
    assert.equal(await todayJobCount('test-token'), 123);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test('customer list fetches later pages and propagates errors instead of showing an empty success', async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      const page = Number(new URL(String(url)).searchParams.get('page'));
      return new Response(
        JSON.stringify({
          success: true,
          data: { data: [{ id: String(page) }], total: 2, totalPages: 2, page, limit: 100 },
        })
      );
    };
    assert.deepEqual(
      (await customerDirectory('token')).map((c) => c.id),
      ['1', '2']
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Geen toegang' } }),
        { status: 403 }
      );
    await assert.rejects(customerDirectory('token'), /Geen toegang/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
