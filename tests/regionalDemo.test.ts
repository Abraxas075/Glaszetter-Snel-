import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { isMeetbon } from '@glaszetter/shared';
const require = createRequire(import.meta.url);
const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
const file = '1700000000019_zaandam-amsterdam-demo.cjs';
const company = '5220781f-633a-453e-93a2-74f9b5235a44';
const other = '00000000-0000-4000-8000-000000000001';
let db: PGlite;
async function migrate(name: string) {
  const builder = new Builder({}, undefined, false, {info(){}, warn(){}, error(){}});
  require('../packages/api/migrations/' + name).up(builder);
  const sql = builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, '');
  if (sql.trim()) await db.exec(sql);
}
before(async () => {
  db = new PGlite();
  for (const name of readdirSync('packages/api/migrations').sort().filter(n => n.endsWith('.cjs') && n !== file)) await migrate(name);
  await db.query("INSERT INTO companies(id,name) VALUES($1,'Glaszetter Snel Demo'),($2,'Ander bedrijf')", [company, other]);
});
after(async () => { await db.close(); });

test('separate test environment does not receive the production import, even with the same company ID', async () => {
  const previous = process.env.APP_ENV;
  try {
    process.env.APP_ENV = 'test';
    await migrate(file);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM jobs')).rows[0].n, 0);
  } finally { if (previous === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = previous; }
});

test('actual import creates exactly 20 regional jobs and 10 valid, matching element measurements and meetbons', async () => {
  await migrate(file);
  const cities = await db.query('SELECT p.city,count(*)::int AS jobs,count(m.job_id)::int AS meetbons FROM jobs j JOIN projects p ON p.id=j.project_id LEFT JOIN meetbons m ON m.job_id=j.id GROUP BY p.city ORDER BY p.city');
  assert.deepEqual(cities.rows, [{city:'Amsterdam',jobs:10,meetbons:5},{city:'Zaandam',jobs:10,meetbons:5}]);
  const counts = (await db.query('SELECT (SELECT count(*)::int FROM customers) AS customers,(SELECT count(*)::int FROM projects) AS projects,(SELECT count(*)::int FROM elements) AS elements,(SELECT count(*)::int FROM measurements) AS measurements')).rows[0];
  assert.deepEqual(counts, {customers:20,projects:20,elements:10,measurements:10});
  const measurements = await db.query<any>('SELECT m.width,m.height,m.glass_type,b.data,b.revision,j.company_id FROM measurements m JOIN meetbons b ON b.job_id=m.job_id JOIN jobs j ON j.id=m.job_id');
  for (const row of measurements.rows) {
    assert.equal(row.company_id, company);
    assert.equal(isMeetbon({...row.data, revision:row.revision}), true);
    assert.equal(Number(row.width), row.data.lines[0].width);
    assert.equal(Number(row.height), row.data.lines[0].height);
    assert.equal(row.glass_type, row.data.lines[0].glassType);
  }
  assert.equal((await db.query("SELECT count(*)::int AS n FROM jobs WHERE status IN ('ordered','delivery_expected') AND order_number IS NOT NULL")).rows[0].n, 4);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM jobs WHERE company_id=$1', [other])).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM customers WHERE name NOT LIKE 'TEST %' OR email IS NOT NULL OR phone IS NOT NULL")).rows[0].n, 0);
});

test('import retry preserves edited input and does not add duplicate jobs, measurements or order numbers', async () => {
  const job = '20261015-1003-4000-8000-000000000001';
  await db.query("UPDATE jobs SET notes='Eigen invoer bewaren' WHERE id=$1", [job]);
  const before = await db.query('SELECT * FROM jobs ORDER BY id');
  const bons = await db.query('SELECT * FROM meetbons ORDER BY job_id');
  const counters = await db.query('SELECT * FROM order_number_counters');
  await migrate(file);
  assert.deepEqual((await db.query('SELECT * FROM jobs ORDER BY id')).rows, before.rows);
  assert.deepEqual((await db.query('SELECT * FROM meetbons ORDER BY job_id')).rows, bons.rows);
  assert.deepEqual((await db.query('SELECT * FROM order_number_counters')).rows, counters.rows);
});

test('partial or conflicting imports stop atomically instead of overwriting existing records', async () => {
  await db.exec('BEGIN');
  await db.query("DELETE FROM jobs WHERE id='20261015-1003-4000-8000-000000000020'");
  await assert.rejects(migrate(file), /gedeeltelijk aanwezig/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM jobs')).rows[0].n, 20);
});
