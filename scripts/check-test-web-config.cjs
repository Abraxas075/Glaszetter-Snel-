process.env.APK_PREVIEW = '1';
process.env.EXPO_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
require('../apps/mobile/app.config.js')({ config: require('../apps/mobile/app.json').expo });
console.log('Testweb gebruikt een expliciete HTTPS-test-API.');
