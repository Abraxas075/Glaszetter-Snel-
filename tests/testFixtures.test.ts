import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import { createTestFixtures } from '../packages/api/src/db/testFixtures';
import { assertDatabaseReady } from '../packages/api/src/db/readiness';
const env = { APP_ENV:'test', DATABASE_URL:'postgresql://fake:fake@test.example/glaszetter_snel_test', JWT_SECRET:'x'.repeat(40), S3_BUCKET:'glaszetter-snel-test',S3_REGION:'auto',S3_ACCESS_KEY_ID:'dummy',S3_SECRET_ACCESS_KEY:'dummy',CORS_ORIGIN:'https://web-test.example',S3_PUBLIC_URL_BASE:'https://photos-test.example',TEST_ADMIN_EMAIL:'owner@test.example',TEST_ADMIN_PASSWORD:'Test-password-never-used-2026' };
const require = createRequire(import.meta.url);
const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
let db: PGlite;
before(async () => {
  db = new PGlite();
  for (const file of readdirSync('packages/api/migrations').sort().filter(f=>f.endsWith('.cjs'))) {
    const builder = new Builder({},undefined,false,{info(){},warn(){},error(){}});
    require('../packages/api/migrations/'+file).up(builder);
    await db.exec(builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/,''));
  }
  await assertDatabaseReady(db);
});
after(async () => { await db.close(); });
test('fresh test database receives working account and quantity-aware meetbon; reseeding preserves edits', async () => {
  await db.exec('BEGIN');
  const result = await createTestFixtures(db, password => bcrypt.hash(password,10), env);
  await db.exec('COMMIT');
  assert.equal(result.created,true);
  const account = (await db.query('SELECT * FROM users')).rows[0];
  assert.equal(account.email,env.TEST_ADMIN_EMAIL);
  assert.equal(await bcrypt.compare(env.TEST_ADMIN_PASSWORD,account.password_hash as string),true);
  const bon = (await db.query('SELECT data, revision FROM meetbons')).rows[0];
  assert.equal(typeof bon.revision,'string');
  const data:any = bon.data;
  assert.ok(Math.abs(data.lines[0].quantity*data.lines[0].width*data.lines[0].height/1e6-0.847)<0.001);
  await db.query(`UPDATE meetbons SET data = jsonb_set(data,'{fields,name}','"Eigen testinvoer"')`);
  assert.equal((await createTestFixtures(db,password=>bcrypt.hash(password,10),env)).created,false);
  const saved:any = (await db.query('SELECT data FROM meetbons')).rows[0].data;
  assert.equal(saved.fields.name,'Eigen testinvoer');
  assert.equal((await db.query('SELECT * FROM jobs')).rows.length,1);
});
test('failed seed can roll back its account and company together', async () => {
  const before = (await db.query('SELECT * FROM companies')).rows.length;
  await db.exec('BEGIN');
  await assert.rejects(createTestFixtures(db,async()=>{throw new Error('hash failure');},{...env,TEST_ADMIN_EMAIL:'second@test.example'}),/hash failure/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT * FROM companies')).rows.length,before);
});

test('test account logs into the actual API and reads a versioned meetbon with restricted browser origin', async () => {
  const { mock } = await import('node:test');
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const { pool } = await import('../packages/api/src/db/pool');
  const query = mock.method(pool, 'query', (sql:string,params:unknown[]) => db.query(sql,params));
  const { default: app } = await import('../packages/api/src/app');
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const response = await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:env.CORS_ORIGIN},body:JSON.stringify({email:env.TEST_ADMIN_EMAIL,password:env.TEST_ADMIN_PASSWORD})});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('access-control-allow-origin'),env.CORS_ORIGIN);
    const token = (await response.json()).data.token;
    assert.ok(token);
    const job:any = (await db.query('SELECT id FROM jobs')).rows[0];
    const bon = await fetch(base+`/api/v1/jobs/${job.id}/meetbon`,{headers:{Authorization:`Bearer ${token}`,Origin:'https://unrelated.example'}});
    assert.equal(bon.status,200); // CORS applies to browsers; native access still works.
    assert.notEqual(bon.headers.get('access-control-allow-origin'),'https://unrelated.example');
    assert.notEqual(bon.headers.get('access-control-allow-origin'),'*');
    assert.equal(typeof (await bon.json()).data.revision,'string');
    assert.equal((await fetch(base+`/api/v1/jobs/${job.id}/meetbon`)).status,401);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve,reject) => server.close(e=>e?reject(e):resolve()));
    query.mock.restore();await pool.end();
    for (const key of Object.keys(env)) if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
  }
});
