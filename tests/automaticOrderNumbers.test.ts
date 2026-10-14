import assert from 'node:assert/strict';
import { before, beforeEach, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
let db: PGlite;
let service: typeof import('../packages/api/src/services/jobService');
const company = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
let projects: Record<string, string>;
let year: number;
const number = (n: number) => `GS-${year}-${String(n).padStart(3, '0')}`;
const create = (status: 'concept' | 'ordered' | 'delivery_expected' = 'ordered', orderNumber?: string, tenant = company) => service.createJob(tenant, { projectId: projects[tenant], name: 'Bestelling', status, orderNumber });

before(async () => {
  db = new PGlite();
  const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
  for (const file of readdirSync('packages/api/migrations').sort().filter(f => f.endsWith('.cjs'))) {
    const builder = new Builder({}, undefined, false, { info(){}, warn(){}, error(){} });
    require('../packages/api/migrations/' + file).up(builder);
    await db.exec(builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, ''));
  }
  await db.query("INSERT INTO companies(id,name) VALUES ($1,'Eigen'),($2,'Ander')", [company, other]);
  projects = {};
  for (const tenant of [company, other]) {
    const customer = (await db.query<{id: string}>("INSERT INTO customers(company_id,name) VALUES($1,'Klant') RETURNING id", [tenant])).rows[0].id;
    projects[tenant] = (await db.query<{id: string}>("INSERT INTO projects(company_id,customer_id,name) VALUES($1,$2,'Project') RETURNING id", [tenant, customer])).rows[0].id;
  }
  year = Number((await db.query<{year: number}>("SELECT EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Amsterdam')::integer AS year")).rows[0].year);
  const { pool } = await import('../packages/api/src/db/pool');
  mock.method(pool, 'query', (sql: string, parameters: unknown[]) => db.query(sql, parameters));
  service = await import('../packages/api/src/services/jobService');
});
beforeEach(async () => { await db.exec('DELETE FROM jobs; DELETE FROM order_number_counters;'); });
after(async () => { mock.restoreAll(); await db.close(); });

test('number starts at ordering, is returned immediately and survives reload and later edits', async () => {
  const draft = await create('concept');
  assert.equal(draft.orderNumber, undefined);
  const saved = await service.updateJob(company, draft.id, { status: 'ordered' });
  assert.equal(saved.orderNumber, number(1));
  assert.equal((await service.getJob(company, draft.id)).orderNumber, number(1));
  assert.equal((await service.updateJob(company, draft.id, { supplierName: 'Leverancier', deliveryDate: '2026-10-21', orderNumber: null })).orderNumber, number(1));
  assert.equal((await service.updateJob(company, draft.id, { status: 'delivery_expected' })).orderNumber, number(1));
  assert.equal((await create('delivery_expected')).orderNumber, number(2));
});

test('parallel service calls get distinct consecutive numbers and deleting a job does not reuse its number', async () => {
  // PGlite serializes execution; these parallel callers exercise the real SQL trigger and service.
  const results = await Promise.all(Array.from({length: 20}, () => create()));
  assert.deepEqual(results.map(r => r.orderNumber).sort(), Array.from({length: 20}, (_, i) => number(i + 1)));
  await service.deleteJob(company, results[19].id);
  assert.equal((await create()).orderNumber, number(21));
});

test('manual and existing numbers are preserved; automatic counter advances beyond current-year numbers', async () => {
  const manual = await create('ordered', number(998).toLowerCase());
  const legacy = await create('concept', 'Leverancier-42');
  assert.equal((await service.updateJob(company, legacy.id, { status: 'ordered' })).orderNumber, 'Leverancier-42');
  assert.equal((await create()).orderNumber, number(999));
  assert.equal((await create()).orderNumber, number(1000));
  assert.equal((await service.getJob(company, manual.id)).orderNumber, number(998).toLowerCase());
  await assert.rejects(create('ordered', number(999)), (error: any) => error.code === 'ORDER_NUMBER_EXISTS');
});

test('company and calendar-year counters are separate; old year does not raise this year counter', async () => {
  await create('ordered', `GS-${year - 1}-999`);
  await db.query('INSERT INTO order_number_counters VALUES($1,$2,999)', [company, year - 1]);
  const saved = await create();
  assert.equal(saved.orderNumber, number(1));
  assert.equal((await create('ordered', undefined, other)).orderNumber, number(1));
  await assert.rejects(service.updateJob(other, saved.id, { orderNumber: null }), /not found/i);
  assert.equal((await create()).orderNumber, number(2));
});

test('rolled back orders do not consume numbers or leave a counter behind', async () => {
  await db.exec('BEGIN');
  assert.equal((await create()).orderNumber, number(1));
  await db.exec('ROLLBACK');
  assert.equal((await create()).orderNumber, number(1));
});
