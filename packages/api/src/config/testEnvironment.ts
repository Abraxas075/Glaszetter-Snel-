export function assertTestEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.APP_ENV !== 'test') throw new Error('Testvoorbereiding vereist APP_ENV=test.');
  let db: URL;
  try { db = new URL(env.DATABASE_URL ?? ''); } catch { throw new Error('Testdatabase ontbreekt of is ongeldig.'); }
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || decodeURIComponent(db.pathname) !== '/glaszetter_snel_test') {
    throw new Error('Testvoorbereiding geweigerd: DATABASE_URL moet database glaszetter_snel_test gebruiken.');
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('Gebruik een afzonderlijke JWT_SECRET van minimaal 32 tekens.');
  if (env.S3_BUCKET !== 'glaszetter-snel-test') throw new Error('Gebruik de aparte fotobucket glaszetter-snel-test.');
  for (const key of ['S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    if (!env[key]) throw new Error(`${key} is vereist voor de testfotobucket.`);
  }
  for (const key of ['CORS_ORIGIN', 'S3_PUBLIC_URL_BASE']) {
    let url: URL;
    try { url = new URL(env[key] ?? ''); } catch { throw new Error(`${key} vereist een expliciet HTTPS-testadres.`); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || ['glaszetter-api.onrender.com'].includes(url.hostname)) throw new Error(`${key} is geen geldig HTTPS-testadres.`);
    if (key === 'CORS_ORIGIN' && url.origin !== env[key]) throw new Error('CORS_ORIGIN moet één HTTPS-origin zijn, zonder pad.');
  }
  if (env.S3_ENDPOINT) {
    const endpoint = new URL(env.S3_ENDPOINT);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('S3_ENDPOINT moet HTTPS gebruiken zonder inloggegevens in het adres.');
  }
}
