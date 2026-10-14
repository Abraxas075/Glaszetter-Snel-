import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'username-test-only-secret';
let db: PGlite;
let auth: typeof import('../packages/api/src/services/authService');
let users: typeof import('../packages/api/src/services/userService');
let batches: typeof import('../packages/api/src/services/employeeBatch');
const company = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
before(async () => {
  db = new PGlite();
  const Builder = require('node-pg-migrate/dist/migrationBuilder').default;
  for (const file of readdirSync('packages/api/migrations').sort().filter(f => f.endsWith('.cjs'))) {
    const builder = new Builder({}, undefined, false, { info(){}, warn(){}, error(){} });
    require('../packages/api/migrations/' + file).up(builder);
    await db.exec(builder.getSql().replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, ''));
  }
  await db.query("INSERT INTO companies(id,name) VALUES ($1,'Eigen bedrijf'),($2,'Ander bedrijf')", [company, other]);
  const { pool } = await import('../packages/api/src/db/pool');
  mock.method(pool, 'query', (sql: string, params: unknown[]) => db.query(sql, params));
  mock.method(pool, 'connect', async () => ({ query: (sql: string, params?: unknown[]) => db.query(sql, params), release(){} }));
  auth = await import('../packages/api/src/services/authService');
  users = await import('../packages/api/src/services/userService');
  batches = await import('../packages/api/src/services/employeeBatch');
});
after(async () => { mock.restoreAll(); await db.close(); });
test('username login requires the right password, is case insensitive and preserves email login', async () => {
  const user = await users.createUser(company, { name: 'Roberto', username: 'Roberto', password: 'test-only-password', role: 'glaszetter' });
  assert.equal(user.username, 'roberto'); assert.equal(user.email, '');
  const logged = await auth.login(' ROBERTO ', 'test-only-password');
  assert.equal(logged.user.id, user.id); assert.equal(auth.verifyToken(logged.token).companyId, company);
  await assert.rejects(auth.login('roberto', 'wrong'), auth.InvalidCredentialsError);
  await users.createUser(company, { name: 'Legacy', email: 'owner@example.test', password: 'legacy-only-password', role: 'owner' });
  assert.equal((await auth.login('owner@example.test', 'legacy-only-password')).user.name, 'Legacy');
  await assert.rejects(users.createUser(other, { name: 'Andere Roberto', username: 'ROBERTO', password: 'other-only-password', role: 'glaszetter' }), users.EmailInUseError);
});
test('batch links existing employees without changing their password and new staff use unique generated passwords', async () => {
  const list = ['Roberto','Rick','Justin','Leo','Roy','Obi'].map(name => ({ name, username: name.toLowerCase() }));
  const accounts = await batches.createEmployeeBatch(company, list);
  assert.equal(accounts[0].created, false); assert.equal(accounts[0].password, undefined);
  const created = accounts.filter(a => a.created); assert.equal(created.length, 5); assert.equal(new Set(created.map(a => a.password)).size, 5);
  for (const account of created) {
    const logged = await auth.login(account.username, account.password!);
    assert.equal(logged.user.role, 'glaszetter'); assert.equal(logged.user.companyId, company);
  }
  assert.equal((await auth.login('roberto', 'test-only-password')).user.name, 'Roberto');
  const retry = await batches.createEmployeeBatch(company, list); assert.ok(retry.every(a => !a.created && !a.password));
  assert.equal((await db.query('SELECT id FROM users WHERE username IS NOT NULL')).rows.length, 6);
});
test('batch collisions roll back new accounts and reject ambiguous names or usernames', async () => {
  await assert.rejects(batches.createEmployeeBatch(other, [{ name:'Nieuw', username:'nieuw' }, { name:'Rick', username:'rick' }]), batches.EmployeeConflictError);
  assert.equal((await db.query("SELECT id FROM users WHERE username='nieuw'")).rows.length, 0);
  assert.equal(batches.validateEmployees([{ name:'Rick',username:'Rick' }, { name:'Dubbel', username:'rick' }]), false);
  assert.equal(batches.validateEmployees([{ name:'Rick',username:'rick@example.test' }]), false);
  assert.equal(batches.validateEmployees([{ name:'Rick',username:'rick' }]), true);
  await assert.rejects(db.query("INSERT INTO users(company_id,email,password_hash,name,role) VALUES($1,NULL,'unused','No identifier','glaszetter')", [company]));
});

test('employee creation requires an owner or admin and never exposes password hashes', async () => {
  const { usersRouter } = await import('../packages/api/src/routes/users');
  const app = express(); app.use(express.json()); app.use('/users', usersRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}/users`;
  try {
    const post = (token?: string) => fetch(origin + '/employee-batch', { method:'POST',headers:{'Content-Type':'application/json',...(token ? {Authorization:'Bearer '+token}: {})},body:JSON.stringify({employees:[{name:'Extra',username:'extra'}]}) });
    assert.equal((await post()).status,401);
    const employee = await auth.login('roberto','test-only-password'); assert.equal((await post(employee.token)).status,403);
    const owner = await auth.login('owner@example.test','legacy-only-password');
    const created = await post(owner.token); assert.equal(created.status,201); assert.equal(created.headers.get('cache-control'),'no-store');
    const account = (await created.json()).data[0]; assert.equal(account.created,true); assert.equal(account.password.length,24);
    const list = await (await fetch(origin,{headers:{Authorization:'Bearer '+owner.token}})).json();
    assert.ok(list.data.every((user: any) => !('password' in user) && !('password_hash' in user)));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
