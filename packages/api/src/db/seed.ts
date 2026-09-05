import { pool } from './pool';
import { hashPassword } from '../services/authService';

const SEED_COMPANY_NAME = 'Glaszetter Snel Demo';
const SEED_USER_EMAIL = 'admin@glaszettersnel.nl';
const SEED_USER_PASSWORD = 'ChangeMe123!';
const SEED_USER_NAME = 'Demo Eigenaar';

const seed = async () => {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    SEED_USER_EMAIL,
  ]);

  if (existing.rows.length > 0) {
    console.log('✓ Seed data already present, skipping.');
    return;
  }

  const companyResult = await pool.query<{ id: string }>(
    'INSERT INTO companies (name) VALUES ($1) RETURNING id',
    [SEED_COMPANY_NAME]
  );
  const companyId = companyResult.rows[0].id;

  const passwordHash = await hashPassword(SEED_USER_PASSWORD);

  await pool.query(
    `INSERT INTO users (company_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, 'owner')`,
    [companyId, SEED_USER_EMAIL, passwordHash, SEED_USER_NAME]
  );

  console.log('✓ Seed data created:');
  console.log(`  Company: ${SEED_COMPANY_NAME} (${companyId})`);
  console.log(`  Login:   ${SEED_USER_EMAIL} / ${SEED_USER_PASSWORD}`);
};

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
