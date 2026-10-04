import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertTestEnvironment } from '../packages/api/src/config/testEnvironment';
import { createTestFixtures } from '../packages/api/src/db/testFixtures';
const env = {
  APP_ENV: 'test', DATABASE_URL: 'postgresql://fake:fake@test.example/glaszetter_snel_test',
  JWT_SECRET: 'x'.repeat(40), S3_BUCKET: 'glaszetter-snel-test', S3_REGION: 'auto',
  S3_ACCESS_KEY_ID: 'dummy', S3_SECRET_ACCESS_KEY: 'dummy',
  CORS_ORIGIN: 'https://web-test.example', S3_PUBLIC_URL_BASE: 'https://photos-test.example',
  TEST_ADMIN_EMAIL: 'owner@test.example', TEST_ADMIN_PASSWORD: 'Test-password-never-used-2026',
};
export const testEnvironment = env;
test('test migration guard rejects production database names and incomplete storage settings', () => {
  assert.doesNotThrow(() => assertTestEnvironment(env));
  for (const bad of [
    { APP_ENV: 'production' }, { DATABASE_URL: 'postgresql://fake:fake@test.example/glaszetter_snel' },
    { DATABASE_URL: 'not-a-url' }, { S3_BUCKET: 'production-photos' }, { S3_SECRET_ACCESS_KEY: '' },
    { JWT_SECRET: 'short' }, { CORS_ORIGIN: 'https://web-test.example/path' },
    { S3_PUBLIC_URL_BASE: 'http://photos-test.example' },
  ]) assert.throws(() => assertTestEnvironment({ ...env, ...bad }));
});
test('test seeding refuses production configuration before any query is executed', async () => {
  let queries = 0;
  await assert.rejects(createTestFixtures({ query: async () => { queries++; return { rows: [] }; } }, async () => 'hash', { ...env, DATABASE_URL: 'postgresql://fake:fake@test.example/glaszetter_snel' }));
  assert.equal(queries, 0);
});
