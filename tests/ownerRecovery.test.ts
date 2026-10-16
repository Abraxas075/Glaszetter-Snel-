import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import type {Pool} from 'pg';
import {inspectOwner,parseRecoveryTarget,recoverOwner,validateNewPassword} from '../packages/api/src/db/ownerRecovery';
let db:PGlite;
let pool:Pool;
const target={userId:'00000000-0000-4000-8000-000000000001',companyId:'00000000-0000-4000-8000-000000000002',email:'owner@example.test'};
const oldPassword='disposable-old-password',newPassword='disposable-new-password';
before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE TABLE companies(id uuid PRIMARY KEY,name text);
    CREATE TABLE users(id uuid PRIMARY KEY,company_id uuid,email text,role text,password_hash text,updated_at timestamptz);
    CREATE TABLE jobs(id int PRIMARY KEY,name text,supplier_name text);
    CREATE TABLE meetbons(job_id int,data jsonb);
    INSERT INTO companies VALUES ('${target.companyId}','Bestaand bedrijf');
    INSERT INTO jobs VALUES (1,'Bestaande klus','Leverancier');
    INSERT INTO meetbons VALUES (1,'{"lines":[{"width":1000,"height":900}]}');`);
  const hash=await bcrypt.hash(oldPassword,10);
  await db.query("INSERT INTO users VALUES($1,$2,$3,'owner',$4,'2026-01-01'),('00000000-0000-4000-8000-000000000003',$2,'employee@example.test','glaszetter',$4,'2026-01-01')",[target.userId,target.companyId,target.email,hash]);
  const query=(sql:string,params?:unknown[])=>db.query(sql,params);
  pool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
});
after(async()=>{await db.close();});
async function snapshot(){return JSON.stringify((await db.query('SELECT row_to_json(u) AS data FROM users u ORDER BY id')).rows);}
test('recovery accepts exact target flags and rejects password arguments, missing or duplicate flags',()=>{
  const flags=['--user-id',target.userId,'--company-id',target.companyId,'--email',' OWNER@example.test '];
  assert.deepEqual(parseRecoveryTarget(flags),target);
  for(const args of [[],[...flags,'--password','not-a-real-secret'],[...flags,'--email',target.email],flags.slice(0,-1)]) assert.throws(()=>parseRecoveryTarget(args));
  for(const value of ['short','a'.repeat(73),'é'.repeat(37),'valid-length-but\nnewline','valid-length-but\0nul']) assert.throws(()=>validateNewPassword(value));
  validateNewPassword('é'.repeat(36));
});
test('only the exact existing owner can be inspected or recovered; wrong targets leave all accounts unchanged',async()=>{
  assert.equal(await inspectOwner(pool,target),'Bestaand bedrijf');
  const before=await snapshot();
  for(const wrong of [{...target,userId:'00000000-0000-4000-8000-000000000099'},{...target,companyId:'00000000-0000-4000-8000-000000000099'},{...target,email:'other@example.test'},{...target,userId:'00000000-0000-4000-8000-000000000003',email:'employee@example.test'}]){
    await assert.rejects(inspectOwner(pool,wrong));await assert.rejects(recoverOwner(pool,wrong,newPassword));
  }
  await assert.rejects(recoverOwner(pool,target,'short'));
  assert.equal(await snapshot(),before);
});
test('password replacement preserves identity, role, employee credentials and operational data; repeat is a no-op',async()=>{
  const operational=JSON.stringify({jobs:(await db.query('SELECT * FROM jobs')).rows,bons:(await db.query('SELECT * FROM meetbons')).rows});
  const employee=(await db.query("SELECT * FROM users WHERE role='glaszetter'")).rows;
  await recoverOwner(pool,target,newPassword);
  const owner=(await db.query('SELECT * FROM users WHERE id=$1',[target.userId])).rows[0];
  assert.equal(owner.id,target.userId);assert.equal(owner.company_id,target.companyId);assert.equal(owner.role,'owner');assert.equal(owner.email,target.email);
  assert.equal(await bcrypt.compare(newPassword,owner.password_hash),true);assert.equal(await bcrypt.compare(oldPassword,owner.password_hash),false);
  assert.deepEqual((await db.query("SELECT * FROM users WHERE role='glaszetter'")).rows,employee);
  assert.equal(JSON.stringify({jobs:(await db.query('SELECT * FROM jobs')).rows,bons:(await db.query('SELECT * FROM meetbons')).rows}),operational);
  const saved=await snapshot();await assert.rejects(recoverOwner(pool,target,newPassword));assert.equal(await snapshot(),saved);
});
test('a failed write rolls back and preserves the old owner credentials',async()=>{
  const before=await snapshot();
  const failing={connect:async()=>({query:(sql:string,params?:unknown[])=>{if(sql.startsWith('UPDATE users'))throw new Error('disposable simulated write failure');return db.query(sql,params);},release(){}})} as unknown as Pool;
  await assert.rejects(recoverOwner(failing,target,'another-disposable-password'));
  assert.equal(await snapshot(),before);
});
