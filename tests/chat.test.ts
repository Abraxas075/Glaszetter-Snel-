import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { mergeChatMessages, normalizeChatText } from '@glaszetter/shared';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'chat-disposable-test-secret';
Object.assign(process.env, {
  S3_REGION: 'eu-west-1',
  S3_BUCKET: 'test-only',
  S3_PUBLIC_URL_BASE: 'https://media.example.test',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
});
const company = randomUUID(),
  other = randomUUID(),
  owner = randomUUID(),
  colleague = randomUUID(),
  outsider = randomUUID();
let db: PGlite, job: string, otherJob: string, origin: string;
let server: import('node:http').Server;
let signToken: (typeof import('../packages/api/src/services/authService'))['signToken'];
let pool: (typeof import('../packages/api/src/db/pool'))['pool'];
const puts: PutObjectCommand[] = [],
  deletes: DeleteObjectCommand[] = [];
before(async () => {
  db = new PGlite();
  const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
  for (const file of readdirSync('packages/api/migrations')
    .filter((f) => f.endsWith('.cjs'))
    .sort()) {
    const b = new Builder({}, undefined, false, { info() {}, warn() {}, error() {} });
    require('../packages/api/migrations/' + file).up(b);
    await db.exec(b.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, ''));
  }
  await db.query("INSERT INTO companies(id,name) VALUES($1,'Testbedrijf'),($2,'Ander bedrijf')", [
    company,
    other,
  ]);
  await db.query(
    "INSERT INTO users(id,company_id,name,username,role,password_hash) VALUES($1,$2,'Beheerder','owner','owner','unused'),($3,$2,'Medewerker','worker','glaszetter','unused'),($4,$5,'Ander','other','external','unused')",
    [owner, company, colleague, outsider, other]
  );
  async function createJob(c: string) {
    const customer = (
      await db.query<any>(
        "INSERT INTO customers(company_id,name) VALUES($1,'Klant') RETURNING id",
        [c]
      )
    ).rows[0].id;
    const project = (
      await db.query<any>(
        "INSERT INTO projects(company_id,customer_id,name) VALUES($1,$2,'Project') RETURNING id",
        [c, customer]
      )
    ).rows[0].id;
    return (
      await db.query<any>(
        "INSERT INTO jobs(company_id,project_id,name) VALUES($1,$2,'Klus') RETURNING id",
        [c, project]
      )
    ).rows[0].id;
  }
  job = await createJob(company);
  otherJob = await createJob(other);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, params: unknown[]) => db.query(sql, params));
  mock.method(S3Client.prototype, 'send', async (command: unknown) => {
    if (command instanceof PutObjectCommand) puts.push(command);
    else if (command instanceof DeleteObjectCommand) deletes.push(command);
    else throw new Error('Unexpected storage');
    return {};
  });
  ({ signToken } = await import('../packages/api/src/services/authService'));
  const { default: app } = await import('../packages/api/src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  origin = `http://127.0.0.1:${(server.address() as any).port}/api/v1/chat`;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>((r) => server.close(() => r()));
  mock.restoreAll();
  await pool?.end();
  await db?.close();
});
const headers = (userId = owner, companyId = company) => ({
  Authorization: `Bearer ${signToken({ companyId, userId, role: 'owner' })}`,
  'Content-Type': 'application/json',
});
const send = (text: string, channel = 'company', clientId = randomUUID(), userId = owner) =>
  fetch(`${origin}/channels/${channel}/messages`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify({ text, clientId, senderId: outsider, companyId: other }),
  });
const list = async (channel = 'company', suffix = '', userId = owner, companyId = company) =>
  fetch(`${origin}/channels/${channel}/messages${suffix}`, { headers: headers(userId, companyId) });
test('chat requires a real account in the claimed company and filters job channels', async () => {
  assert.equal((await fetch(origin + '/channels')).status, 401);
  assert.equal((await fetch(origin + '/channels', { headers: headers(owner, other) })).status, 401);
  const channels = (await (await fetch(origin + '/channels', { headers: headers() })).json()).data;
  assert.ok(channels.some((c: any) => c.id === 'company'));
  assert.ok(channels.some((c: any) => c.id === job));
  assert.ok(!channels.some((c: any) => c.id === otherJob));
  assert.equal((await list(otherJob)).status, 404);
  assert.equal((await send('test', otherJob)).status, 404);
});
test('saved messages reopen for a colleague, preserve the real sender and remain inside the company', async () => {
  const response = await send('  Glas geleverd\nTot morgen.  ');
  assert.equal(response.status, 201);
  const saved = (await response.json()).data;
  assert.equal(saved.text, 'Glas geleverd\nTot morgen.');
  assert.equal(saved.senderId, owner);
  assert.equal(saved.senderName, 'Beheerder');
  const response2 = await list('company', '', colleague);
  assert.equal(response2.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response2.json()).data.messages[0].id, saved.id);
  assert.equal((await (await list('company', '', outsider, other)).json()).data.messages.length, 0);
  assert.equal((await send('Klusbericht', job)).status, 201);
  assert.equal((await (await list(job)).json()).data.messages.length, 1);
  assert.equal((await (await list()).json()).data.messages.length, 1);
});
test('simultaneous retries store one message and reusing a key with changed content or channel is refused', async () => {
  const clientId = randomUUID();
  const responses = await Promise.all([
    send('Een keer', job, clientId),
    send('Een keer', job, clientId),
  ]);
  assert.ok(responses.every((r) => r.status === 201));
  const records = await Promise.all(responses.map((r) => r.json()));
  assert.equal(records[0].data.id, records[1].data.id);
  assert.equal((await send('Anders', job, clientId)).status, 409);
  assert.equal((await send('Een keer', 'company', clientId)).status, 409);
  assert.equal(
    (await db.query('SELECT id FROM chat_messages WHERE client_id=$1', [clientId])).rows.length,
    1
  );
});
test('history paginates without duplicates and rejects invalid text and cursors', async () => {
  for (let i = 0; i < 55; i++) assert.equal((await send('Regel ' + i, job)).status, 201);
  const latest = (await (await list(job)).json()).data;
  assert.equal(latest.messages.length, 50);
  assert.equal(latest.hasOlder, true);
  const older = (await (await list(job, '?before=' + latest.messages[0].sequence)).json()).data;
  assert.equal(older.hasOlder, false);
  const merged = mergeChatMessages(older.messages, latest.messages);
  assert.equal(merged.length, 57);
  assert.equal(new Set(merged.map((m) => m.id)).size, 57);
  for (const cursor of ['-1', 'x', '9223372036854775808'])
    assert.equal((await list(job, '?before=' + cursor)).status, 400);
  for (const text of ['', ' ', 'x'.repeat(4001), 'bad\u0000', 'bad\ud800'])
    assert.equal((await send(text)).status, 400);
  assert.equal(normalizeChatText('Goed 😀'), 'Goed 😀');
  const synthetic = (id: string, sequence: string) => ({ ...latest.messages[0], id, sequence });
  assert.deepEqual(
    mergeChatMessages(
      [synthetic('a', '9007199254740993')],
      [synthetic('b', '9007199254740992')]
    ).map((m) => m.id),
    ['b', 'a']
  );
});
async function attach(channel: string, bytes: Buffer, clientId = randomUUID(), text = '') {
  const body = new FormData();
  body.append('file', new Blob([bytes]), 'voorbeeld.mp4');
  body.append('clientId', clientId);
  body.append('text', text);
  const auth = headers();
  return fetch(`${origin}/channels/${channel}/attachments`, {
    method: 'POST',
    headers: { Authorization: auth.Authorization },
    body,
  });
}
test('photo and video attachments reopen, retry safely and never upload for another company’s job', async () => {
  const video = Buffer.from([
    0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109, 109, 112,
    52, 50,
  ]);
  const before = puts.length;
  assert.equal((await attach(otherJob, video)).status, 404);
  assert.equal(puts.length, before);
  const clientId = randomUUID();
  const first = await attach(job, video, clientId, 'Controle');
  assert.equal(first.status, 201);
  const saved = (await first.json()).data;
  assert.equal(saved.attachment.kind, 'video');
  assert.equal(saved.text, 'Controle');
  const retry = await attach(job, video, clientId, 'Controle');
  assert.equal(retry.status, 201);
  assert.equal((await retry.json()).data.id, saved.id);
  assert.ok(deletes.length > 0);
  assert.equal((await attach(job, Buffer.from('<html>no</html>'))).status, 400);
  const photo = await attach('company', Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]));
  assert.equal(photo.status, 201);
  assert.equal((await photo.json()).data.attachment.kind, 'photo');
  const reopened = (await (await list(job, '', colleague)).json()).data.messages;
  assert.ok(
    reopened.some((m: any) => m.id === saved.id && m.attachment.url === saved.attachment.url)
  );
});

test('job chat attachments also appear in that job’s gallery, without company-chat leakage', async () => {
  const { listJobMedia } = await import('../packages/api/src/services/mediaService');
  const media = await listJobMedia(company, job);
  assert.ok(media.some((item) => item.kind === 'video' && item.caption === 'Controle'));
  assert.ok(media.every((item) => item.jobId === job));
  assert.ok(!media.some((item) => item.kind === 'photo'));
});
