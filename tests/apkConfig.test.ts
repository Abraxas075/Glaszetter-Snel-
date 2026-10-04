import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const configure = require('../apps/mobile/app.config.js');
const base = require('../apps/mobile/app.json').expo;
test('test APK requires an explicit separate HTTPS API and keeps its own package', () => {
  const oldPreview = process.env.APK_PREVIEW, oldApi = process.env.EXPO_PUBLIC_API_URL;
  try {
    process.env.APK_PREVIEW = '1';
    for (const value of ['', 'http://test.example/api/v1', 'https://glaszetter-api.onrender.com/api/v1', 'https://test.example', 'https://user:password@test.example/api/v1', 'https://test.example/api/v1?token=x']) {
      process.env.EXPO_PUBLIC_API_URL = value;
      assert.throws(() => configure({ config: base }));
    }
    process.env.EXPO_PUBLIC_API_URL = 'https://test.example/api/v1';
    const testApp = configure({ config: base });
    assert.equal(testApp.android.package, 'com.abraxas.glaszettersnel.preview');
    assert.equal(testApp.name, 'Glaszetter Snel Test');
    process.env.APK_PREVIEW = '0';
    assert.equal(configure({ config: base }).android.package, base.android.package);
  } finally {
    if (oldPreview === undefined) delete process.env.APK_PREVIEW; else process.env.APK_PREVIEW = oldPreview;
    if (oldApi === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = oldApi;
  }
});
