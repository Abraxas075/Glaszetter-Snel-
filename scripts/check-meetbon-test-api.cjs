// Read-only check. Credentials come from the environment and are never printed.
async function main() {
  process.env.APK_PREVIEW = '1';
  require('../apps/mobile/app.config.js')({ config: require('../apps/mobile/app.json').expo });
  const { EXPO_PUBLIC_API_URL: api, APK_TEST_TOKEN: token, APK_TEST_JOB_ID: job } = process.env;
  if (!token || !job || !/^[0-9a-f-]{36}$/i.test(job)) throw new Error('Stel APK_TEST_TOKEN en APK_TEST_JOB_ID in voor een bestaande testklus.');
  const response = await fetch(`${api}/jobs/${job}/meetbon`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Meetboncontrole geweigerd (HTTP ${response.status}).`);
  const body = await response.json();
  const data = body.data;
  const valid = body.success && data && Object.hasOwn(data, 'revision')
    && (data.revision === null || typeof data.revision === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.revision));
  if (!valid) throw new Error('Deze API geeft geen meetbon-versie terug. Controleer migratie 12 en de API-uitrol.');
  console.log('Test-API bereikbaar; meetbon bevat versiecode. Voer de gelijktijdige toesteltest uit vóór vrijgave.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
