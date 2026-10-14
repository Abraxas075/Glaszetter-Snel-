module.exports = ({ config }) => {
  const preview = process.env.APK_PREVIEW === '1';
  const production = process.env.APK_PRODUCTION === '1';
  if (preview && production) throw new Error('Kies één APK-omgeving.');
  if (production && process.env.EXPO_PUBLIC_API_URL !== 'https://glaszetter-api.onrender.com/api/v1') {
    throw new Error('Een productie-APK moet dezelfde HTTPS-API als de website gebruiken.');
  }
  if (preview) {
    let api;
    try { api = new URL(process.env.EXPO_PUBLIC_API_URL); } catch {
      throw new Error('Een test-APK vereist een expliciete HTTPS-test-API.');
    }
    if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash
      || api.pathname !== '/api/v1' || api.hostname === 'glaszetter-api.onrender.com') {
      throw new Error('Gebruik een aparte HTTPS-test-API met pad /api/v1, zonder productieadres, inloggegevens of query.');
    }
  }
  return {
    ...config,
    name: preview ? 'Glaszetter Snel Test' : config.name,
    scheme: preview ? 'glaszettersnel-test' : config.scheme,
    android: {
      ...config.android,
      package: preview ? 'com.abraxas.glaszettersnel.preview' : config.android.package,
      versionCode: Number(process.env.ANDROID_VERSION_CODE || 1),
    },
  };
};
