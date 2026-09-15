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
