import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'health-test-only-secret';

test('health publishes only a valid source revision so APK/server releases can be compared', async () => {
  const previous = process.env.RENDER_GIT_COMMIT;
  const { default: app } = await import('../packages/api/src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/health`;
  try {
    const commit = '0123456789abcdef0123456789abcdef01234567';
    process.env.RENDER_GIT_COMMIT = commit;
    const response = await fetch(url);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const health = await response.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.commit, commit);
    process.env.RENDER_GIT_COMMIT = 'invalid-value';
    assert.equal('commit' in await (await fetch(url)).json(), false);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previous === undefined) delete process.env.RENDER_GIT_COMMIT; else process.env.RENDER_GIT_COMMIT = previous;
  }
});
