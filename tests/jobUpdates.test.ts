import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// Run the actual service SQL against disposable PostgreSQL in memory.
// Never connect the tests to a developer's or production database.
const previousDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
let db: PGlite;
let service: typeof import('../packages/api/src/services/jobService');
let pool: (typeof import('../packages/api/src/db/pool'))['pool'];

const companyId = '00000000-0000-4000-8000-000000000001';
const otherCompanyId = '00000000-0000-4000-8000-000000000002';
const projectId = '00000000-0000-4000-8000-000000000003';
const teamId = '00000000-0000-4000-8000-000000000004';
const otherTeamId = '00000000-0000-4000-8000-000000000005';
const jobId = '00000000-0000-4000-8000-000000000006';
const nextTeamId = '00000000-0000-4000-8000-000000000007';

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TYPE job_status AS ENUM (
      'concept', 'measuring', 'quote', 'approved', 'ordered', 'delivery_expected',
      'scheduled', 'in_progress', 'completion', 'completed', 'invoiced'
    );
    CREATE TABLE projects (id uuid PRIMARY KEY, company_id uuid NOT NULL);
    CREATE TABLE teams (id uuid PRIMARY KEY, company_id uuid NOT NULL);
    CREATE TABLE jobs (
      id uuid PRIMARY KEY,
      company_id uuid NOT NULL,
      project_id uuid NOT NULL REFERENCES projects(id),
      name text NOT NULL,
      status job_status NOT NULL DEFAULT 'concept',
      due_date timestamptz,
      team_id uuid REFERENCES teams(id),
      scheduled_date date,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE meetbons (job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE, data jsonb NOT NULL, revision uuid NOT NULL DEFAULT gen_random_uuid(), updated_at timestamptz DEFAULT now());
    CREATE TABLE elements (job_id uuid NOT NULL);
    CREATE TABLE measurements (job_id uuid NOT NULL);
    CREATE TABLE photos (job_id uuid NOT NULL);
    CREATE TABLE quotes (job_id uuid NOT NULL);
    CREATE TABLE invoices (job_id uuid NOT NULL);
  `);
  await db.query('INSERT INTO projects VALUES ($1, $2)', [projectId, companyId]);
  await db.query('INSERT INTO teams VALUES ($1, $2), ($3, $4), ($5, $2)', [
    teamId,
    companyId,
    otherTeamId,
    otherCompanyId,
    nextTeamId,
  ]);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, parameters: unknown[]) => db.query(sql, parameters));
  service = await import('../packages/api/src/services/jobService');
});

beforeEach(async () => {
  await db.query('DELETE FROM meetbons');
  await db.query('DELETE FROM elements');
  await db.query('DELETE FROM measurements');
  await db.query('DELETE FROM photos');
  await db.query('DELETE FROM quotes');
  await db.query('DELETE FROM invoices');
  await db.query('DELETE FROM jobs');
  await db.query(
    `
    INSERT INTO jobs (id, company_id, project_id, name, status, due_date, team_id, scheduled_date, notes)
    VALUES ($1, $2, $3, 'Testklus', 'scheduled', '2026-09-21T14:30:00Z', $4, '2026-09-14', 'Bewaren')
  `,
    [jobId, companyId, projectId, teamId]
  );
});

after(async () => {
  mock.restoreAll();
  if (pool) await pool.end();
  if (db) await db.close();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('omitted fields retain their saved values', async () => {
  await service.updateJob(companyId, jobId, { name: 'Nieuwe naam' });
  const saved = await service.getJob(companyId, jobId);
  assert.equal(saved.name, 'Nieuwe naam');
  assert.equal(saved.teamId, teamId);
  assert.equal(saved.notes, 'Bewaren');
  assert.equal(new Date(saved.scheduledDate!).toISOString().slice(0, 10), '2026-09-14');
  assert.equal(new Date(saved.dueDate!).toISOString(), '2026-09-21T14:30:00.000Z');
});

test('explicit null clears the team, dates and notes and survives a reload', async () => {
  await service.updateJob(companyId, jobId, {
    teamId: null,
    scheduledDate: null,
    dueDate: null,
    notes: null,
  });
  const saved = await service.getJob(companyId, jobId);
  assert.equal(saved.teamId, undefined);
  assert.equal(saved.scheduledDate, undefined);
  assert.equal(saved.dueDate, undefined);
  assert.equal(saved.notes, undefined);
  assert.equal(saved.name, 'Testklus');
  assert.equal(saved.status, 'scheduled');
  const result = await db.query(
    'SELECT team_id, scheduled_date, due_date, notes FROM jobs WHERE id = $1',
    [jobId]
  );
  assert.deepEqual(result.rows[0], {
    team_id: null,
    scheduled_date: null,
    due_date: null,
    notes: null,
  });
});

test('clearing one field does not clear omitted fields', async () => {
  await service.updateJob(companyId, jobId, { teamId: null });
  const saved = await service.getJob(companyId, jobId);
  assert.equal(saved.teamId, undefined);
  assert.equal(saved.notes, 'Bewaren');
  assert.equal(new Date(saved.scheduledDate!).toISOString().slice(0, 10), '2026-09-14');
});

test('new assignments and dates can still be saved, including due-date time', async () => {
  await service.updateJob(companyId, jobId, {
    teamId: nextTeamId,
    scheduledDate: '2026-09-20',
    dueDate: '2026-09-25T16:45:00Z',
    notes: 'Aangepast',
  });
  const saved = await service.getJob(companyId, jobId);
  assert.equal(saved.teamId, nextTeamId);
  assert.equal(new Date(saved.scheduledDate!).toISOString().slice(0, 10), '2026-09-20');
  assert.equal(new Date(saved.dueDate!).toISOString(), '2026-09-25T16:45:00.000Z');
  assert.equal(saved.notes, 'Aangepast');
});

test('another company cannot clear the job or assign its team', async () => {
  await assert.rejects(service.updateJob(otherCompanyId, jobId, { teamId: null }), /not found/i);
  await assert.rejects(service.updateJob(companyId, jobId, { teamId: otherTeamId }), /not found/i);
  const saved = await service.getJob(companyId, jobId);
  assert.equal(saved.teamId, teamId);
  assert.equal(saved.notes, 'Bewaren');
});

test('work data protects a job from deletion, while an empty job can be deleted', async () => {
  await db.query('INSERT INTO photos VALUES ($1)', [jobId]);
  await assert.rejects(
    service.deleteJob(companyId, jobId),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'JOB_HAS_WORK_DATA'
  );
  assert.equal((await service.getJob(companyId, jobId)).name, 'Testklus');

  await db.query('DELETE FROM photos');
  await assert.rejects(service.deleteJob(otherCompanyId, jobId), /not found/i);
  await service.deleteJob(companyId, jobId);
  await assert.rejects(service.getJob(companyId, jobId), /not found/i);
});

 test('meetbon persists across reloads, protects deletion and is isolated by company', async () => {
  const { saveMeetbon, getMeetbon } = await import('../packages/api/src/services/meetbonService');
  const data = { revision: null, fields: { name: 'Testklant' }, checks: { g1c0: true }, lines: [{ quantity: 2, width: 875, height: 484, glassType: 'HR++', notes: 'Woonkamer' }] };
  assert.deepEqual(await getMeetbon(companyId, jobId), { fields: {}, checks: {}, lines: [], revision: null });
  const saved = await saveMeetbon(companyId, jobId, data);
  assert.deepEqual(await getMeetbon(companyId, jobId), saved);
  await assert.rejects(getMeetbon(otherCompanyId, jobId), /not found/i);
  await assert.rejects(saveMeetbon(otherCompanyId, jobId, data), /not found/i);
  await assert.rejects(service.deleteJob(companyId, jobId), /meetbon/i);
  await service.updateJob(companyId, jobId, { notes: 'Nieuwe notitie' });
  assert.deepEqual(await getMeetbon(companyId, jobId), saved);
});

test('a saved empty bon does not block deletion of an otherwise empty job', async () => {
  const { saveMeetbon } = await import('../packages/api/src/services/meetbonService');
  await saveMeetbon(companyId, jobId, { revision: null, fields: { name: '' }, checks: { g1c0: false }, lines: [] });
  await service.deleteJob(companyId, jobId);
  assert.equal((await db.query('SELECT * FROM meetbons')).rows.length, 0);
});

for (const data of [
  { fields: { name: ' ' }, checks: {}, lines: [] },
  { fields: {}, checks: { g1c0: true }, lines: [] },
  { fields: {}, checks: {}, lines: [{ quantity: 1, width: 1, height: 1, glassType: '', notes: '' }] },
  { fields: {}, checks: {}, lines: [], legacy: 'Bewaren' },
  { fields: {}, checks: {} },
]) test(`any content or malformed legacy bon protects the job: ${JSON.stringify(data)}`, async () => {
  await db.query('INSERT INTO meetbons (job_id, data) VALUES ($1, $2::jsonb)', [jobId, JSON.stringify(data)]);
  await assert.rejects(service.deleteJob(companyId, jobId), /meetbon/i);
  assert.deepEqual((await db.query('SELECT data FROM meetbons')).rows[0].data, data);
});

for (const table of ['elements', 'measurements', 'photos', 'quotes', 'invoices']) {
  test(`even an empty bon keeps a job with ${table} protected`, async () => {
    const { saveMeetbon } = await import('../packages/api/src/services/meetbonService');
    await saveMeetbon(companyId, jobId, { fields: {}, checks: {}, lines: [], revision: null });
    await db.query(`INSERT INTO ${table} VALUES ($1)`, [jobId]);
    await assert.rejects(service.deleteJob(companyId, jobId), /meetbon/i);
    assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length, 1);
  });
}

test('delete bon requires the current snapshot, respects company isolation and preserves all work data', async () => {
  const { saveMeetbon, getMeetbon, deleteMeetbon } = await import('../packages/api/src/services/meetbonService');
  let first = { revision: null as string | null, fields: { name: 'Eerste' }, checks: {}, lines: [] };
  let latest = { ...first, fields: { name: 'Nieuwere invoer' } };
  first = await saveMeetbon(companyId, jobId, first) as typeof first;
  for (const table of ['elements', 'measurements', 'photos', 'quotes', 'invoices']) await db.query(`INSERT INTO ${table} VALUES ($1)`, [jobId]);
  latest = await saveMeetbon(companyId, jobId, { ...latest, revision: first.revision }) as typeof latest;
  await assert.rejects(deleteMeetbon(otherCompanyId, jobId, latest), /not found/i);
  await assert.rejects(deleteMeetbon(companyId, jobId, first), (e: any) => e.code === 'MEETBON_CHANGED');
  assert.deepEqual(await getMeetbon(companyId, jobId), latest);
  await deleteMeetbon(companyId, jobId, latest);
  assert.deepEqual(await getMeetbon(companyId, jobId), { fields: {}, checks: {}, lines: [], revision: null });
  assert.equal((await service.getJob(companyId, jobId)).notes, 'Bewaren');
  for (const table of ['elements', 'measurements', 'photos', 'quotes', 'invoices']) assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length, 1);
  await deleteMeetbon(companyId, jobId, latest); // idempotent retry
});

test('actual HTTP meetbon storage accepts maximum valid content, bounds requests and preserves saved data on rejection', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'disposable-storage-test-key';
  const { default: jwt } = await import('jsonwebtoken');
  const { default: app } = await import('../packages/api/src/app');
  const { MEETBON_SECTIONS, isMeetbon } = await import('@glaszetter/shared');
  const { getMeetbon } = await import('../packages/api/src/services/meetbonService');
  const token = jwt.sign({ companyId, userId: companyId, role: 'admin' }, process.env.JWT_SECRET);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const request = (path: string, body: string, method = 'PUT', authenticated = true) => fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body,
  });
  try {
    // U+0001 is JSON-escaped to six bytes and supported by PostgreSQL jsonb (unlike U+0000).
    const text = '\u0001'.repeat(2000);
    const data = {
      revision: null,
      fields: Object.fromEntries(MEETBON_SECTIONS.flatMap(s => s.fields.map(f => [f.key, text]))),
      checks: Object.fromEntries(MEETBON_SECTIONS.flatMap(s => s.checks.map(c => [c.key, true]))),
      lines: Array.from({ length: 200 }, () => ({ quantity: 10000, width: 100000, height: 100000, glassType: text, notes: text })),
    };
    assert.equal(isMeetbon(data), true);
    const body = JSON.stringify(data);
    assert.ok(Buffer.byteLength(body) > 2 * 1024 * 1024);
    const response = await request(`/jobs/${jobId}/meetbon`, body);
    assert.equal(response.status, 200);
    const saved = (await response.json()).data;
    assert.deepEqual(await getMeetbon(companyId, jobId), saved);
    const stale = await request(`/jobs/${jobId}/meetbon`, body);
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).error.code, 'MEETBON_CHANGED');
    const { revision: ignored, ...unversioned } = saved;
    assert.equal((await request(`/jobs/${jobId}/meetbon`, JSON.stringify(unversioned))).status, 409);
    assert.equal((await request(`/jobs/${jobId}/meetbon`, JSON.stringify({ ...saved, revision: 'broken' }))).status, 409);
    const huge = JSON.stringify({ content: 'x'.repeat(8 * 1024 * 1024) });
    const tooLarge = await request(`/jobs/${jobId}/meetbon`, huge);
    assert.equal(tooLarge.status, 413);
    assert.equal((await tooLarge.json()).error.code, 'REQUEST_TOO_LARGE');
    assert.deepEqual(await getMeetbon(companyId, jobId), saved);
    assert.equal((await request(`/jobs/${jobId}`, JSON.stringify({ notes: 'x'.repeat(110000) }), 'PATCH')).status, 413);
    assert.equal((await request(`/jobs/${jobId}/meetbon`, '{}', 'PUT', false)).status, 401);
    const invalid = await request(`/jobs/${jobId}/meetbon`, '{');
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
    assert.equal((await request(`/jobs/${jobId}/meetbon`, '{}', 'DELETE')).status, 400);
    assert.deepEqual(await getMeetbon(companyId, jobId), saved);
    assert.equal((await request(`/jobs/${jobId}/meetbon`, JSON.stringify(saved), 'DELETE')).status, 204);
    assert.equal((await fetch(`${base}/jobs/${jobId}/meetbon/pdf`, { headers: { Authorization: `Bearer ${token}` } })).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});

test('concurrent writers have one winner, stale clients and unversioned clients cannot overwrite', async () => {
  const { saveMeetbon, getMeetbon } = await import('../packages/api/src/services/meetbonService');
  const base = await getMeetbon(companyId, jobId);
  const results = await Promise.allSettled([
    saveMeetbon(companyId, jobId, { ...base, fields: { name: 'Web' } }),
    saveMeetbon(companyId, jobId, { ...base, fields: { name: 'Expo' } }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code, 'MEETBON_CHANGED');
  const saved = await getMeetbon(companyId, jobId);
  await assert.rejects(saveMeetbon(companyId, jobId, base), (e: any) => e.code === 'MEETBON_CHANGED');
  await assert.rejects(saveMeetbon(companyId, jobId, { fields: {}, checks: {}, lines: [] }), (e: any) => e.code === 'MEETBON_CHANGED');
  const updates = await Promise.allSettled([
    saveMeetbon(companyId, jobId, { ...saved, fields: { name: 'A' } }),
    saveMeetbon(companyId, jobId, { ...saved, fields: { name: 'B' } }),
  ]);
  assert.equal(updates.filter(r => r.status === 'fulfilled').length, 1);
});

test('delete and recreation cannot reuse an old revision even with identical content', async () => {
  const { saveMeetbon, getMeetbon, deleteMeetbon } = await import('../packages/api/src/services/meetbonService');
  const first = await saveMeetbon(companyId, jobId, { ...(await getMeetbon(companyId, jobId)), fields: { name: 'Klant' } });
  await deleteMeetbon(companyId, jobId, first);
  await assert.rejects(saveMeetbon(companyId, jobId, first), (e: any) => e.code === 'MEETBON_CHANGED');
  const next = await saveMeetbon(companyId, jobId, { ...first, revision: null });
  assert.notEqual(first.revision, next.revision);
  await assert.rejects(deleteMeetbon(companyId, jobId, first), (e: any) => e.code === 'MEETBON_CHANGED');
  assert.deepEqual(await getMeetbon(companyId, jobId), next);
});
