import app from './app';
import { assertTestEnvironment } from './config/testEnvironment';
import { pool } from './db/pool';
import { assertDatabaseReady } from './db/readiness';
import { startApi } from './startup';

startApi(app, () => {
  if (process.env.APP_ENV === 'test') assertTestEnvironment();
  return assertDatabaseReady(pool);
}, process.env.PORT || 3001)
  .then(() => console.log('✓ Glaszetter Snel API running'))
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : 'API startup failed');
    await pool.end();
    process.exitCode = 1;
  });

export default app;
