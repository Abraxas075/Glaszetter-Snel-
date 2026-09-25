module.exports = ({ config }) => {
  const preview = process.env.APK_PREVIEW === '1';
  if (preview && !process.env.EXPO_PUBLIC_API_URL?.startsWith('https://')) {
    throw new Error('A test APK requires an HTTPS EXPO_PUBLIC_API_URL.');
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
