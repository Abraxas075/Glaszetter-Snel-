import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'disposable-emergency-alert-test-secret';
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
let origin: string;
let pool: typeof import('../packages/api/src/db/pool')['pool'];
let signToken: typeof import('../packages/api/src/services/authService')['signToken'];
let server: ReturnType<ReturnType<typeof express>['listen']>;
before(async () => {
 db = new PGlite();
 await db.exec('CREATE TABLE companies (id uuid PRIMARY KEY)');
 await db.query('INSERT INTO companies VALUES ($1),($2)', [owner, other]);
 const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
 const builder = new Builder({}, undefined, false, { info(){}, warn(){}, error(){} });
 require('../packages/api/migrations/1700000000013_emergency-alerts.cjs').up(builder);
 await db.exec(builder.getSql());
 ({pool} = await import('../packages/api/src/db/pool'));
 mock.method(pool, 'query', (sql: string, params: unknown[]) => db.query(sql, params));
 ({signToken} = await import('../packages/api/src/services/authService'));
 const {emergencyAlertsRouter} = await import('../packages/api/src/routes/emergencyAlerts');
 const app = express();app.use(express.json());app.use('/alerts', emergencyAlertsRouter);
 server = app.listen(0, '127.0.0.1');await new Promise<void>(resolve => server.once('listening', resolve));
 origin = `http://127.0.0.1:${(server.address() as any).port}/alerts`;
});
after(async () => {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));mock.restoreAll();await pool.end();await db.close();});
const headers = (company = owner, role: 'owner' | 'external' = 'owner') => ({Authorization: `Bearer ${signToken({userId:company,companyId:company,role})}`, 'Content-Type':'application/json'});
test('emergency alerts require employee login and reject malformed input', async () => {
 assert.equal((await fetch(origin)).status,401);
 assert.equal((await fetch(origin,{headers:headers(owner,'external')})).status,403);
 for (const title of ['', ' '.repeat(5), 'x'.repeat(121), 'bad\u0000']) {
  assert.equal((await fetch(origin,{method:'POST',headers:headers(),body:JSON.stringify({title})})).status,400);
 }
});
test('creation, reopening, status and revisions persist, with company isolation and stale-write rejection', async () => {
 const response=await fetch(origin,{method:'POST',headers:headers(),body:JSON.stringify({title:'  Gebroken winkelruit  ',description:'Glas veiligstellen',address:'Voorbeeldstraat 1',phone:'0612345678',companyId:other})});
 assert.equal(response.status,201);const created=(await response.json()).data;
 assert.equal(created.title,'Gebroken winkelruit');assert.equal(created.status,'open');
 const list=await (await fetch(origin,{headers:headers()})).json();assert.equal(list.data.length,1);assert.deepEqual(list.data[0],created);
 assert.equal((await (await fetch(origin,{headers:headers(other)})).json()).data.length,0);
 const patch=(revision:string,status:string,company=owner)=>fetch(origin+'/'+created.id,{method:'PATCH',headers:headers(company),body:JSON.stringify({revision,status})});
 assert.equal((await patch(created.revision,'in_progress',other)).status,404);
 const updated=await patch(created.revision,'in_progress');assert.equal(updated.status,200);const working=(await updated.json()).data;
 assert.notEqual(working.revision,created.revision);
 assert.equal((await patch(created.revision,'resolved')).status,409);
 assert.equal((await patch(working.revision,'invalid')).status,400);
 const completed=await patch(working.revision,'resolved');assert.equal(completed.status,200);const done=(await completed.json()).data;
 assert.equal((await (await fetch(origin,{headers:headers()})).json()).data[0].status,'resolved');
 const concurrent = await Promise.all([patch(done.revision,'open'),patch(done.revision,'in_progress')]);
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 assert.equal((await db.query('SELECT * FROM emergency_alerts')).rows.length,1);
});
