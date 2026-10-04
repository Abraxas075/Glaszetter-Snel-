import assert from 'node:assert/strict';
import { after, before, test, mock } from 'node:test';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { assertDatabaseReady } from '../packages/api/src/db/readiness';
import { startApi } from '../packages/api/src/startup';

const require = createRequire(import.meta.url);
const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
let db: PGlite;
async function migrate(file: string) {
  const builder = new Builder({}, undefined, false, { info() {}, warn() {}, error() {} });
  require(`../packages/api/migrations/${file}`).up(builder);
  // PGlite has gen_random_uuid built in; it does not package the pgcrypto extension.
  const sql = builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, '');
  await db.exec(sql);
}
before(async () => {
  db = new PGlite();
  for (const file of readdirSync('packages/api/migrations').sort().filter(f => f.endsWith('.cjs') && !f.includes('0011_') && !f.includes('0012_'))) await migrate(file);
});
after(async () => { mock.restoreAll(); await db.close(); });

test('unmigrated meetbon database refuses startup before opening a listening socket', async () => {
  const app = express();
  const listen = mock.method(app, 'listen', () => { throw new Error('must never listen'); });
  await assert.rejects(startApi(app, () => assertDatabaseReady(db), 0), /meetbons.*npm run migrate/);
  assert.equal(listen.mock.callCount(), 0);
});

test('actual meetbon migration satisfies schema checks, which are read-only', async () => {
  await db.exec("INSERT INTO companies (name) VALUES ('Bewaren')");
  const before = await db.query('SELECT * FROM companies');
  await migrate('1700000000011_create-meetbons.cjs');
  await assert.rejects(assertDatabaseReady(db), /meetbons.revision/);
  await migrate('1700000000012_meetbon-revision.cjs');
  await assertDatabaseReady(db);
  await assertDatabaseReady(db);
  assert.deepEqual((await db.query('SELECT * FROM companies')).rows, before.rows);
});

test('nullable data, wrong column type and missing cascade are caught before startup', async () => {
  await db.exec('ALTER TABLE meetbons ALTER COLUMN data DROP NOT NULL');
  await assert.rejects(assertDatabaseReady(db), /data NOT NULL/);
  await db.exec('ALTER TABLE meetbons ALTER COLUMN data SET NOT NULL; ALTER TABLE meetbons ALTER COLUMN data TYPE text USING data::text');
  await assert.rejects(assertDatabaseReady(db), /meetbons.data/);
  await db.exec('ALTER TABLE meetbons ALTER COLUMN data TYPE jsonb USING data::jsonb; ALTER TABLE meetbons DROP CONSTRAINT meetbons_job_id_fkey; ALTER TABLE meetbons ADD FOREIGN KEY (job_id) REFERENCES jobs(id)');
  await assert.rejects(assertDatabaseReady(db), /ON DELETE CASCADE/);
});

test('healthy schema check completes before listener creation', async () => {
  const app = express(); let ready = false;
  const original = app.listen.bind(app);
  mock.method(app, 'listen', (...args: any[]) => { assert.equal(ready, true); return (original as any)(...args); });
  const server = await startApi(app, async () => { ready = true; }, 0);
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
});

test('revision migration keeps existing meetbon JSON and assigns each row a unique token', async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec(`CREATE TABLE jobs (id uuid PRIMARY KEY);
      CREATE TABLE meetbons (job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
        data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
      INSERT INTO jobs VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
      INSERT INTO meetbons SELECT id, '{"fields":{"name":"Bewaren"},"checks":{},"lines":[]}'::jsonb FROM jobs;`);
    const before = await legacy.query('SELECT job_id, data, updated_at FROM meetbons ORDER BY job_id');
    const builder = new Builder({}, undefined, false, { info() {}, warn() {}, error() {} });
    require('../packages/api/migrations/1700000000012_meetbon-revision.cjs').up(builder);
    await legacy.exec(builder.getSql());
    assert.deepEqual((await legacy.query('SELECT job_id, data, updated_at FROM meetbons ORDER BY job_id')).rows, before.rows);
    const revisions = (await legacy.query('SELECT revision FROM meetbons')).rows;
    assert.equal(new Set(revisions.map(r => r.revision)).size, 2);
    assert.ok(revisions.every(r => typeof r.revision === 'string'));
  } finally { await legacy.close(); }
});
