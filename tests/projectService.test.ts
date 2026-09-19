import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const previousDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';

let db: PGlite;
let service: typeof import('../packages/api/src/services/projectService');
let pool: (typeof import('../packages/api/src/db/pool'))['pool'];

const companyId = '00000000-0000-4000-8000-000000000001';
const otherCompanyId = '00000000-0000-4000-8000-000000000002';
const customerId = '00000000-0000-4000-8000-000000000003';
const projectId = '00000000-0000-4000-8000-000000000004';
const emptyProjectId = '00000000-0000-4000-8000-000000000005';
const jobId = '00000000-0000-4000-8000-000000000006';

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TYPE project_status AS ENUM ('concept', 'active', 'completed', 'archived');
    CREATE TABLE customers (id uuid PRIMARY KEY, company_id uuid NOT NULL);
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      company_id uuid NOT NULL,
      customer_id uuid NOT NULL REFERENCES customers(id),
      name text NOT NULL,
      address text,
      city text,
      description text,
      status project_status NOT NULL DEFAULT 'concept',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE jobs (id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id));
  `);
  await db.query('INSERT INTO customers VALUES ($1, $2)', [customerId, companyId]);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, parameters: unknown[]) => db.query(sql, parameters));
  service = await import('../packages/api/src/services/projectService');
});

beforeEach(async () => {
  await db.query('DELETE FROM jobs');
  await db.query('DELETE FROM projects');
  await db.query(
    `INSERT INTO projects
       (id, company_id, customer_id, name, address, city, description, status)
     VALUES
       ($1, $2, $3, 'Testproject', 'Oud 1', 'Zaandam', 'Bewaren', 'active'),
       ($4, $2, $3, 'Leeg project', null, null, null, 'concept')`,
    [projectId, companyId, customerId, emptyProjectId]
  );
});

after(async () => {
  mock.restoreAll();
  if (pool) await pool.end();
  if (db) await db.close();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('project edits preserve omitted values and clear explicit empty fields', async () => {
  await service.updateProject(companyId, projectId, { name: 'Nieuwe naam' });
  let saved = await service.getProject(companyId, projectId);
  assert.equal(saved.name, 'Nieuwe naam');
  assert.equal(saved.address, 'Oud 1');
  assert.equal(saved.city, 'Zaandam');

  await service.updateProject(companyId, projectId, {
    address: null,
    city: null,
    description: null,
  });
  saved = await service.getProject(companyId, projectId);
  assert.equal(saved.name, 'Nieuwe naam');
  assert.equal(saved.address, undefined);
  assert.equal(saved.city, undefined);
  assert.equal(saved.description, undefined);
  assert.equal(saved.status, 'active');
});

test('a project with jobs is protected from deletion', async () => {
  await db.query('INSERT INTO jobs VALUES ($1, $2)', [jobId, projectId]);
  await assert.rejects(
    service.deleteProject(companyId, projectId),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'PROJECT_HAS_JOBS'
  );
  assert.equal((await service.getProject(companyId, projectId)).name, 'Testproject');
});

test('an empty project can be deleted, but never across companies', async () => {
  await assert.rejects(service.deleteProject(otherCompanyId, emptyProjectId), /not found/i);
  await service.deleteProject(companyId, emptyProjectId);
  await assert.rejects(service.getProject(companyId, emptyProjectId), /not found/i);
});
