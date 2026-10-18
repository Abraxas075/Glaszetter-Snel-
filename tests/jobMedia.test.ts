import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { MEDIA_MAX_BYTES, PHOTO_MAX_BYTES, safeMediaUrl } from '@glaszetter/shared';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'media-tests-only-secret';
Object.assign(process.env, {
  S3_REGION: 'eu-west-1',
  S3_BUCKET: 'test-only',
  S3_PUBLIC_URL_BASE: 'https://media.example.test',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
});
const company = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002';
let db: PGlite, job: string, otherJob: string, element: string, origin: string;
let server: import('node:http').Server;
let signToken: (typeof import('../packages/api/src/services/authService'))['signToken'];
let pool: (typeof import('../packages/api/src/db/pool'))['pool'];
let failInsert = false;
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
  // Existing measurement photos must appear even if they only carry an element link.
  element = (
    await db.query<any>(
      "INSERT INTO elements(company_id,job_id,project_id,type,code) SELECT $1,$2,project_id,'fixed_window','D01' FROM jobs WHERE id=$2 RETURNING id",
      [company, job]
    )
  ).rows[0].id;
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, params: unknown[]) => {
    if (failInsert && sql.startsWith('INSERT INTO job_videos')) {
      failInsert = false;
      throw new Error('simulated database failure');
    }
    return db.query(sql, params);
  });
  mock.method(S3Client.prototype, 'send', async (command: unknown) => {
    if (command instanceof PutObjectCommand) puts.push(command);
    else if (command instanceof DeleteObjectCommand) deletes.push(command);
    else throw new Error('Unexpected storage operation');
    return {};
  });
  ({ signToken } = await import('../packages/api/src/services/authService'));
  const { default: app } = await import('../packages/api/src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  origin = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>((r) => server.close(() => r()));
  mock.restoreAll();
  await pool?.end();
  await db?.close();
});
const headers = (c = company) => ({
  Authorization: `Bearer ${signToken({ companyId: c, userId: c, role: 'owner' })}`,
});
const mp4 = Buffer.from([
  0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115, 111, 109, 109, 112, 52,
  50,
]);
async function upload(target = job, content = mp4, c = company, filename = 'voorbeeld.mp4') {
  const form = new FormData();
  form.append('file', new Blob([content]), filename);
  form.append('caption', 'Voor de montage');
  return fetch(origin + '/media/' + target, { method: 'POST', headers: headers(c), body: form });
}
test('media requires login and checks job ownership before writing any storage', async () => {
  assert.equal((await fetch(origin + '/media?jobId=' + job)).status, 401);
  const before = puts.length;
  assert.equal((await upload(otherJob)).status, 404);
  assert.equal(
    (await fetch(origin + '/media?jobId=' + job, { headers: headers(other) })).status,
    404
  );
  assert.equal((await fetch(origin + '/media?jobId=invalid', { headers: headers() })).status, 400);
  assert.equal(puts.length, before);
});
test('upload/reload preserves videos and captions without putting videos in photos or PDF input', async () => {
  const response = await upload();
  assert.equal(response.status, 201);
  const saved = (await response.json()).data;
  assert.equal(saved.kind, 'video');
  assert.equal(saved.filename, 'voorbeeld.mp4');
  assert.equal(saved.caption, 'Voor de montage');
  const listing = await fetch(origin + '/media?jobId=' + job, { headers: headers() });
  assert.equal(listing.headers.get('cache-control'), 'private, no-store');
  assert.ok((await listing.json()).data.some((item: any) => item.id === saved.id));
  const photoList = await fetch(origin + '/photos?jobId=' + job, { headers: headers() });
  assert.equal((await photoList.json()).data.length, 0);
  const service = await import('../packages/api/src/services/jobService');
  await assert.rejects(service.deleteJob(company, job), /meetbon/i);
});
test('new photos and older element-only photos appear together with their original associations', async () => {
  const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);
  const response = await upload(job, jpeg, company, '../ruit.jpg');
  assert.equal(response.status, 201);
  const saved = (await response.json()).data;
  assert.equal(saved.kind, 'photo');
  assert.equal(saved.filename, 'ruit.jpg');
  await db.query(
    "INSERT INTO photos(company_id,element_id,storage_key,url,original_filename) VALUES($1,$2,'old-photo','https://media.example.test/old.jpg','D01.jpg')",
    [company, element]
  );
  const items = (await (await fetch(origin + '/media?jobId=' + job, { headers: headers() })).json())
    .data;
  assert.equal(items.filter((item: any) => item.kind === 'photo').length, 2);
  assert.ok(items.some((item: any) => item.filename === 'D01.jpg' && item.jobId === job));
  assert.equal(
    (await db.query<any>("SELECT job_id FROM photos WHERE storage_key='old-photo'")).rows[0].job_id,
    null
  );
});
test('unsupported files, oversized photos and unsafe view URLs are rejected', async () => {
  const before = puts.length;
  assert.equal(
    (await upload(job, Buffer.from('<html>bad</html>'), company, 'fake.mp4')).status,
    400
  );
  assert.equal(puts.length, before);
  const { detectMedia } = await import('../packages/api/src/services/mediaService');
  assert.throws(() => detectMedia(Buffer.alloc(MEDIA_MAX_BYTES + 1)), /50 MB/);
  const tooBigPhoto = Buffer.alloc(PHOTO_MAX_BYTES + 1);
  tooBigPhoto.set([255, 216, 255]);
  assert.throws(() => detectMedia(tooBigPhoto), /15 MB/);
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,bad',
    'https://user:pass@example.test/a',
    'http://example.test',
  ])
    assert.equal(safeMediaUrl(url), null);
  assert.equal(
    safeMediaUrl('https://media.example.test/video.mp4'),
    'https://media.example.test/video.mp4'
  );
});
test('a failed metadata insert cleans up the uploaded video and leaves the gallery unchanged', async () => {
  const before = (await db.query('SELECT id FROM job_videos')).rows.length,
    deleted = deletes.length;
  failInsert = true;
  assert.equal((await upload()).status, 500);
  assert.equal((await db.query('SELECT id FROM job_videos')).rows.length, before);
  assert.equal(deletes.length, deleted + 1);
  assert.equal(deletes.at(-1)!.input.Key, puts.at(-1)!.input.Key);
});
