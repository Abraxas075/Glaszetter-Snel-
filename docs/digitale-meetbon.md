# Digitale meetbon

Bron: Meetbon Glaszettersnel digitaal.xlsx, tabblad Glaszettersnel. Blad2 is leeg. Het originele bestand blijft ongewijzigd beschikbaar via de webapp.

Web: open een klus en ga naar Digitale meetbon. Vul gegevens, keuzes en ruiten in; sla op. De meetbon wordt via de bestaande bedrijfsauthenticatie per klus opgeslagen. Expo: open de elementenlijst van een klus en kies Digitale meetbon. Dezelfde meetbon is op beide beschikbaar. Ruiten in een meetbon zijn zelfstandige bonregels; ze maken geen elementen of bestellingen aan.

Losse Android-meetapp: open of maak een project. De digitale meetbon staat onder de projectgegevens en wordt op het toestel opgeslagen. De bestaande Ruiten bevatten hier de glasmaten. Projectgegevens wijzigen behoudt de meetbon. Deze losse app synchroniseert niet met de webapp.

Vóór uitrol van API/web/Expo: voer de database-migratie uit via `npm run migrate --workspace=@glaszetter/api`. Een klus met een opgeslagen meetbon is beschermd tegen verwijderen. Er wordt geen productieomgeving automatisch gemigreerd.

Validatie: aantallen positief en geheel; breedte/hoogte positief in mm; maximaal 200 bonregels. Lege meetbonnen zijn toegestaan. Schilderwerk vraagt om klusfoto’s via de bestaande foto-interface.

## PDF van de ingevulde meetbon

Web: kies **Opslaan en PDF downloaden**. Expo: kies **Opslaan en PDF delen** en sla het document op of deel het via het systeemvenster. Beide knoppen slaan eerst de actuele invoer op; bij een mislukte opslag wordt geen PDF gedownload. Fouten laten de formulierinvoer staan. Expo web downloadt het bestand rechtstreeks.

De beveiligde route `GET /api/v1/jobs/:id/meetbon/pdf` exporteert uitsluitend een opgeslagen meetbon van het ingelogde bedrijf. Geen opgeslagen bon geeft 404. De PDF bevat alle velden, Ja/Nee-keuzes, ruiten met aantallen, maten in mm, glastype, opmerkingen, oppervlak per regel en totaal, en de laatste opslagtijd in Nederlandse tijd. Ruiten worden niet omgezet naar elementen of bestellingen.

Foto’s van de klus en de bijbehorende elementen komen in een bijlage. Elementfoto’s zijn met hun elementcode aangeduid, zonder een koppeling aan een bonregel te suggereren. JPG/PNG worden uit de bestaande objectopslag gelezen; externe foto-URL’s worden niet opgehaald. Maximaal 20 foto’s en 30 MiB beelddata worden ingesloten. Alle overige, ontbrekende of niet ondersteunde foto’s blijven met een duidelijke melding vermeld. Zonder foto’s blijft de export beschikbaar.

Uitrol: geen nieuwe migratie. Deploy API en web samen. Expo gebruikt nu `expo-file-system` en `expo-sharing` passend bij SDK 50 en vereist een nieuwe APK; de oude APK krijgt deze knop niet automatisch. De losse Android-meetapp heeft deze serverexport niet, omdat projecten alleen lokaal worden bewaard.
