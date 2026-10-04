// Invoked only after compiling the API. No production seeding or database copying.
const { spawnSync } = require('node:child_process');
const { assertTestEnvironment } = require('../packages/api/dist/config/testEnvironment');
try {
  assertTestEnvironment();
  for (const command of ['migrate', 'seed:test']) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', command, '--workspace', '@glaszetter/api'], { stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`Testvoorbereiding gestopt bij ${command}.`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
