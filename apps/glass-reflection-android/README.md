# Glasdikte Reflectiemeter — Galaxy S24 Ultra
Zelfstandige, offline Android-app voor optische reflectiemeting (2–25 mm).
Bevat de meegeleverde HTML-meter, bankpaskalibratie, optische proefglaskalibratie,
spiegelgetallen en de extra optie **Tekst uit**. Met het oog-icoon
schakel je tussen alle letters/cijfers zichtbaar of verborgen.

## Installeren
Download de APK uit de GitHub Release, open deze op de Galaxy S24 Ultra
en geef Android zo nodig toestemming om uit deze bron te installeren.
De app gebruikt geen netwerk en overschrijft de bestaande Glaszetter Snel-app niet.

## Testen
Plaats de telefoon niet met onbeschermd scherm tegen scherp glas.
Kalibreer de maatlijn met 85,6 mm en test altijd met een ruit van bekende dikte.
Het is een experimentele meter: coatings, gelaagd glas en andere spiegelingen
kunnen meetfouten opleveren. Gebruik metingen niet ongecontroleerd voor bestellingen.

## Build
`gradle :app:assembleDebug` vanuit deze map (JDK 17, Android SDK 35, Gradle 8.9).
