import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const previousDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';

let db: PGlite;
let service: typeof import('../packages/api/src/services/customerService');
let pool: (typeof import('../packages/api/src/db/pool'))['pool'];

const companyId = '00000000-0000-4000-8000-000000000001';
const otherCompanyId = '00000000-0000-4000-8000-000000000002';
const customerId = '00000000-0000-4000-8000-000000000003';
const unusedCustomerId = '00000000-0000-4000-8000-000000000004';
const projectId = '00000000-0000-4000-8000-000000000005';

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE customers (
      id uuid PRIMARY KEY,
      company_id uuid NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      address text,
      city text,
      postal_code text,
      country text,
      tax_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE
    );
  `);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, parameters: unknown[]) => db.query(sql, parameters));
  service = await import('../packages/api/src/services/customerService');
});

beforeEach(async () => {
  await db.query('DELETE FROM projects');
  await db.query('DELETE FROM customers');
  await db.query(
    `INSERT INTO customers
       (id, company_id, name, email, phone, address, city, postal_code, country, tax_id)
     VALUES
       ($1, $2, 'Testklant', 'oud@example.nl', '0612345678', 'Oud 1', 'Zaandam', '1234 AB', 'Nederland', 'NL123'),
       ($3, $2, 'Losse klant', null, null, null, null, null, null, null)`,
    [customerId, companyId, unusedCustomerId]
  );
});

after(async () => {
  mock.restoreAll();
  if (pool) await pool.end();
  if (db) await db.close();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('customer edits preserve omitted values and clear explicit empty fields', async () => {
  await service.updateCustomer(companyId, customerId, { name: 'Nieuwe naam' });
  let saved = await service.getCustomer(companyId, customerId);
  assert.equal(saved.name, 'Nieuwe naam');
  assert.equal(saved.email, 'oud@example.nl');
  assert.equal(saved.city, 'Zaandam');

  await service.updateCustomer(companyId, customerId, {
    email: null,
    phone: null,
    address: null,
    city: null,
    postalCode: null,
    country: null,
    taxId: null,
  });
  saved = await service.getCustomer(companyId, customerId);
  assert.equal(saved.name, 'Nieuwe naam');
  assert.equal(saved.email, undefined);
  assert.equal(saved.phone, undefined);
  assert.equal(saved.address, undefined);
  assert.equal(saved.city, undefined);
  assert.equal(saved.postalCode, undefined);
  assert.equal(saved.country, undefined);
  assert.equal(saved.taxId, undefined);
});

test('a customer with projects cannot be deleted through the service', async () => {
  await db.query('INSERT INTO projects VALUES ($1, $2)', [projectId, customerId]);
  await assert.rejects(
    service.deleteCustomer(companyId, customerId),
    (error: unknown) =>
      error instanceof Error &&
      error.message === 'Verwijder eerst de projecten van deze klant.' &&
      'code' in error &&
      error.code === 'CUSTOMER_HAS_PROJECTS'
  );
  assert.equal((await service.getCustomer(companyId, customerId)).name, 'Testklant');
  assert.equal((await db.query('SELECT COUNT(*) AS count FROM projects')).rows[0].count, 1);
});

test('an unlinked customer can be deleted, but never across companies', async () => {
  await assert.rejects(service.deleteCustomer(otherCompanyId, unusedCustomerId), /not found/i);
  assert.equal((await service.getCustomer(companyId, unusedCustomerId)).name, 'Losse klant');

  await service.deleteCustomer(companyId, unusedCustomerId);
  await assert.rejects(service.getCustomer(companyId, unusedCustomerId), /not found/i);
});
