import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';

test('web API sends authenticated multipart uploads with a browser boundary and retains JSON requests', async () => {
  const requests: { type: string; authorization: string; body: string }[] = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ type: req.headers['content-type'] ?? '', authorization: req.headers.authorization ?? '', body: Buffer.concat(chunks).toString() });
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ success: true, data: { id: 'test-photo' } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const globals = globalThis as any;
  const previousWindow = globals.window, previousStorage = globals.localStorage;
  globals.window = {};
  globals.localStorage = { getItem: () => 'disposable-test-token' };
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${address.port}`;
  try {
    const { apiRequest } = await import('../apps/web/src/lib/api');
    const body = new FormData(); body.append('photoId', 'stable-photo-id'); body.append('photo', new Blob(['test-image'], { type: 'image/png' }), 'ruit.png');
    await apiRequest('/photo', { method: 'POST', body, headers: new Headers({ 'X-Test': 'upload' }) });
    assert.match(requests[0].type, /^multipart\/form-data; boundary=/);
    assert.equal(requests[0].authorization, 'Bearer disposable-test-token');
    assert.match(requests[0].body, /name="photoId"\r\n\r\nstable-photo-id/);
    assert.match(requests[0].body, /filename="ruit.png"/);
    assert.match(requests[0].body, /test-image/);
    await apiRequest('/alert', { method: 'POST', body: JSON.stringify({ title: 'Testmelding' }) });
    assert.equal(requests[1].type, 'application/json');
    assert.deepEqual(JSON.parse(requests[1].body), { title: 'Testmelding' });
  } finally {
    globals.window = previousWindow; globals.localStorage = previousStorage;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
