# Android test-APK voorbereiden

De workflow **Android test APK** bouwt de Expo-app als zelfstandige APK. Deze app bevat web/Expo-versiecontrole, het vergelijkingsscherm en meetbon-PDF-uitvoer. De losse Android-meetapp is een ander project; zijn conceptopslag zit niet in deze APK.

## Vereiste testomgeving

Gebruik een aparte test-API met HTTPS en pad `/api/v1`. De productiehost `glaszetter-api.onrender.com` wordt voor test-APK’s geweigerd. Er is geen standaard API-adres. De server moet fase 1 en fase 2 bevatten, met migraties 11 en 12 uitgevoerd. Gebruik een apart testaccount en testgegevens. Alleen een andere hostnaam is geen bewijs van een andere database: controleer de testomgeving vóór installatie.

Voer de workflow handmatig uit met `test_api_url`, of stel repositoryvariabele `APK_TEST_API_URL` in voor pull-request-builds. Zonder geldig adres stopt de build vóór dependency-installatie. De JavaScript-buildcontrole van het project blijft apart.

Na een succesvolle build is `Glaszetter-Snel-Test.apk` het installeerbare artifact. `test-apk-buildgegevens` bevat SHA-256, commit, API-adres, versienummer en workflow-run. Gebruik geen APK uit een oudere run voor deze bescherming.

De test-app heeft naam **Glaszetter Snel Test** en package `com.abraxas.glaszettersnel.preview`. De workflow gebruikt een tijdelijke debug-sleutel, ook voor de releasevariant. Een later gebouwde APK kan daarom een andere sleutel hebben: als Android een update weigert, is een beheerde testsleutel nodig of moet de eerdere test-app na veiligstellen van gegevens verwijderd worden. Dit is geen Play Store-build.

## Read-only API-controle

Stel `EXPO_PUBLIC_API_URL`, `APK_TEST_TOKEN` en `APK_TEST_JOB_ID` in als omgevingsvariabelen voor een bestaand testaccount en testklus. Voer vanaf de repositoryroot `node scripts/check-meetbon-test-api.cjs` uit. De controle haalt alleen de bon op en controleert de aanwezigheid van een geldige versiecode; hij schrijft geen gegevens en print geen token of boninhoud. Dit bewijst niet dat de volledige conflictflow werkt: daarvoor blijft de toesteltest nodig. Stop nooit tokens in workflow-inputs, patches of de APK.

## Lokaal bouwen

Node 20, Java 17 en Android SDK zijn vereist. Vanaf de repositoryroot:

```sh
npm ci --include=dev
npm run build -w packages/shared
export APK_PREVIEW=1
# Stel EXPO_PUBLIC_API_URL in op het echte adres van de aparte test-API.
export EXPO_PUBLIC_API_URL="https://JOUW-TEST-API/api/v1"
npm run type-check -w apps/mobile
npm run prebuild:android -w apps/mobile
cd apps/mobile/android
./gradlew :app:assembleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

Het adres in dit voorbeeld is een tijdelijke aanduiding, geen werkende testserver. Prebuild en Expo-export leveren op zichzelf geen APK.

## Toestelcontrole

1. Log in op het testaccount en open een bestaande testklus. Controleer meetbon, inmetingen en foto’s.
2. Open dezelfde bon op web en APK. Sla verschillende wijzigingen achtereenvolgens op. De tweede opslag moet een vergelijking geven en de eigen invoer behouden.
3. Test een conflict op hetzelfde veld en op ruitlijsten; maak de keuze, verwerk en sla opnieuw op.
4. Verwijder en maak de bon opnieuw aan. Een nog geopend oud scherm moet opslag en verwijdering weigeren.
5. Maak een PDF, heropen de klus en controleer foto’s, aantallen en m².

De losse Android-meetapp vraagt daarnaast een eigen APK-build en concept/herstarttest. Publicatie, serveruitrol en fysieke toestelcontrole zijn aparte stappen.
