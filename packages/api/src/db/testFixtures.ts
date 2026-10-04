import { assertTestEnvironment } from '../config/testEnvironment';
interface Client { query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; }
// Caller owns transaction and connection. Existing test input is never reset.
export async function createTestFixtures(db: Client, hashPassword: (password: string) => Promise<string>, env = process.env) {
  assertTestEnvironment(env);
  const email = env.TEST_ADMIN_EMAIL, password = env.TEST_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 16) {
    throw new Error('TEST_ADMIN_EMAIL en een uniek TEST_ADMIN_PASSWORD van minimaal 16 tekens zijn vereist.');
  }
  const existing = await db.query('SELECT company_id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return { created: false };
  const company = (await db.query("INSERT INTO companies (name) VALUES ('Glaszetter Snel TEST') RETURNING id")).rows[0].id;
  await db.query("INSERT INTO users (company_id,email,password_hash,name,role) VALUES ($1,$2,$3,'Test Eigenaar','owner')", [company, email, await hashPassword(password)]);
  const customer = (await db.query("INSERT INTO customers (company_id,name,address,city,postal_code) VALUES ($1,'Fictieve Testklant','Voorbeeldstraat 1','Testplaats','0000 AA') RETURNING id", [company])).rows[0].id;
  const project = (await db.query("INSERT INTO projects (company_id,customer_id,name) VALUES ($1,$2,'Meetbon regressietest') RETURNING id", [company, customer])).rows[0].id;
  const job = (await db.query("INSERT INTO jobs (company_id,project_id,name,notes) VALUES ($1,$2,'TEST - woonkamer','Fictieve gegevens; geen productieklus') RETURNING id", [company, project])).rows[0].id;
  await db.query('INSERT INTO meetbons (job_id,data) VALUES ($1,$2::jsonb)', [job, JSON.stringify({fields: {name: 'Fictieve Testklant', street: 'Voorbeeldstraat 1', city: 'Testplaats'}, checks: {g1c0:true}, lines: [{quantity:2,width:875,height:484,glassType:'HR++',notes:'Testregel'}]})]);
  return { created: true, jobId: job };
}
