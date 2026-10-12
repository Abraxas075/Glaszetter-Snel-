import { pool } from './pool';
import { hashPassword } from '../services/authService';

const emailValue = process.env.GLASZETTER_BOOTSTRAP_EMAIL;
const password = process.env.GLASZETTER_BOOTSTRAP_PASSWORD;

const bootstrapOwner = async (): Promise<void> => {
  if (!emailValue && !password) {
    console.log('Owner bootstrap skipped: no credentials configured.');
    return;
  }

  if (!emailValue || !password) {
    throw new Error('Owner bootstrap requires both email and password.');
  }

  const email = emailValue.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16) {
    throw new Error('Owner bootstrap requires a valid email and password of at least 16 characters.');
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (existing.rowCount) {
      throw new Error('Owner bootstrap stopped: the email address already exists.');
    }

    const company = await client.query<{ id: string }>(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id',
      ['Glaszetter Snel'],
    );
    await client.query(
      `INSERT INTO users (company_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'owner')`,
      [company.rows[0].id, email, passwordHash, 'Justin'],
    );
    await client.query('COMMIT');
    console.log('Production owner account created.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

bootstrapOwner()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Owner bootstrap failed.');
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
