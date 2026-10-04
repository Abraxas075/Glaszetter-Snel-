import { pool } from './pool';
import { hashPassword } from '../services/authService';
import { createTestFixtures } from './testFixtures';
import { assertTestEnvironment } from '../config/testEnvironment';
async function main() {
  assertTestEnvironment(); // Before connecting or running any query.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize deployment retries so the same test account isn't seeded twice.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('glaszetter-snel-test-fixtures'))");
    const result = await createTestFixtures(client, hashPassword);
    await client.query('COMMIT');
    console.log(result.created ? `Testaccount en fictieve klus aangemaakt. Testklus-ID: ${result.jobId}` : 'Testaccount bestaat; bestaande testgegevens behouden.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => { void pool.end(); });
