# Android test APK

The **Android test APK** GitHub Actions workflow builds a standalone APK. Open
the successful run and download `Glaszetter-Snel-Test.apk` under Artifacts while
signed in to GitHub. Open it on Android and allow installation from your browser
when prompted. Expo Go and a development computer are not required.

The app is named **Glaszetter Snel Test**, with a separate `.preview` package ID.
It connects to the existing production API. Log in with your existing account;
measurements and photos saved here are real production data.

This internal test build uses the generated Android debug signing key, including
for the release build. It is not a Play Store release. Production distribution
requires a separately managed signing key. No login credentials are bundled.

The workflow runs on pull requests affecting mobile code and can be run manually
after merging. It installs locked dependencies, checks TypeScript, generates the
native project and builds a release APK for ARM64 and ARMv7 devices. The APK
contains its JavaScript bundle and connects over HTTPS.

Local build (Node 20, Java 17 and Android SDK required), from the repository root:

```sh
npm ci --include=dev
npm run build -w packages/shared
export APK_PREVIEW=1
export EXPO_PUBLIC_API_URL=https://glaszetter-api.onrender.com/api/v1
npm run prebuild:android -w apps/mobile
cd apps/mobile/android
./gradlew :app:assembleRelease
```

On a phone, check login, job list, measurement saving, camera/library upload,
microphone permission and Dutch speech input. Check that a saved measurement
remains after restarting. The web app has more office functions than this mobile
app; this first APK focuses on jobs and on-site measurements.
