import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { supplierLinks } from '@glaszetter/shared';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'suppliers-tests-only-secret';
const company = '5220781f-633a-453e-93a2-74f9b5235a44';
const other = '00000000-0000-4000-8000-000000000002';
const migration = '1700000000020_suppliers.cjs';
let db: PGlite;
async function migrate(file: string) {
  const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
  const builder = new Builder({},undefined,false,{info(){},warn(){},error(){}});
  require('../packages/api/migrations/' + file).up(builder);
  await db.exec(builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/,''));
}
before(async () => {
  db = new PGlite();
  for (const file of readdirSync('packages/api/migrations').sort().filter(f => f.endsWith('.cjs') && f !== migration)) await migrate(file);
  await db.query("INSERT INTO companies(id,name) VALUES($1,'Glaszetter Snel Demo'),($2,'Ander bedrijf')", [company,other]);
  await migrate(migration);
  const {pool} = await import('../packages/api/src/db/pool');
  mock.method(pool,'query',(sql:string,params:unknown[]) => db.query(sql,params));
});
after(async () => { mock.restoreAll(); await db.close(); });

test('requested branch contacts are stored once in the selected company, without invented AGC mail addresses', async () => {
  const rows = (await db.query<any>('SELECT * FROM suppliers ORDER BY city')).rows;
  assert.equal(rows.length,3);
  assert.ok(rows.every(row => row.company_id === company));
  const west = rows.find(row => row.city === 'Amsterdam');
  assert.equal(west.address,'Jarmuiden 16'); assert.equal(west.email,'west@vandaglas.com');
  assert.equal(west.phone,'020 613 2551');
  assert.equal(rows.find(row => row.city === 'Haarlem').email,null);
  assert.equal(rows.find(row => row.city === 'Beverwijk').email,null);
  await assert.rejects(db.query('INSERT INTO suppliers(company_id,name) VALUES($1,$2)',[company,rows[0].name.toLowerCase()]));
  await db.query('INSERT INTO suppliers(company_id,name) VALUES($1,$2)',[other,rows[0].name]);
});

test('actual HTTP directory requires login, isolates companies and saves a selected supplier as the order snapshot', async () => {
  const {default:app} = await import('../packages/api/src/app');
  const {signToken} = await import('../packages/api/src/services/authService');
  const token = signToken({companyId:company,userId:company,role:'glaszetter'});
  const otherToken = signToken({companyId:other,userId:other,role:'glaszetter'});
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const headers = {Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  try {
    assert.equal((await fetch(origin+'/suppliers')).status,401);
    const response = await fetch(origin+'/suppliers',{headers});
    assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
    const suppliers = (await response.json()).data;
    assert.equal(suppliers.length,3); assert.ok(suppliers.every((s:any) => s.verifiedAt==='2026-10-15'));
    const otherList = await (await fetch(origin+'/suppliers',{headers:{Authorization:`Bearer ${otherToken}`}})).json();
    assert.equal(otherList.data.length,1); assert.equal(otherList.data[0].phone,null);
    const customer = (await db.query<any>("INSERT INTO customers(company_id,name) VALUES($1,'Test klant') RETURNING id",[company])).rows[0].id;
    const project = (await db.query<any>("INSERT INTO projects(company_id,customer_id,name) VALUES($1,$2,'Test project') RETURNING id",[company,customer])).rows[0].id;
    const job = (await db.query<any>("INSERT INTO jobs(company_id,project_id,name,status) VALUES($1,$2,'Bestelling','ordered') RETURNING id,order_number",[company,project])).rows[0];
    const saved = await fetch(origin+'/jobs/'+job.id,{method:'PATCH',headers,body:JSON.stringify({supplierName:suppliers[0].name})});
    assert.equal(saved.status,200); assert.equal((await saved.json()).data.supplierName,suppliers[0].name);
    await db.query("UPDATE suppliers SET name='Aangepaste leveranciersnaam' WHERE id=$1",[suppliers[0].id]);
    const reopened = (await (await fetch(origin+'/jobs/'+job.id,{headers})).json()).data;
    assert.equal(reopened.supplierName,suppliers[0].name); assert.equal(reopened.orderNumber,job.order_number);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('contact links support real telephone/mail/web apps and reject unsafe website schemes or credentials', () => {
  assert.deepEqual(supplierLinks({phone:'020 613 2551',email:'west@vandaglas.com',website:'https://vandaglas.com/contact/'}),{phone:'tel:0206132551',email:'mailto:west%40vandaglas.com',website:'https://vandaglas.com/contact/'});
  for (const website of ['javascript:alert(1)','file:///etc/passwd','https://user:password@example.test','http://example.test']) assert.equal(supplierLinks({phone:null,email:null,website}).website,null);
  assert.equal(supplierLinks({phone:'020?body=unexpected',email:'x@example.test\r\nBcc:other@example.test',website:null}).phone,null);
  assert.equal(supplierLinks({phone:null,email:'x@example.test\r\nBcc:other@example.test',website:null}).email,null);
});
