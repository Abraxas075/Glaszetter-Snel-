# Digitale meetbon

Bron: Meetbon Glaszettersnel digitaal.xlsx, tabblad Glaszettersnel. Blad2 is leeg. Het originele bestand blijft ongewijzigd beschikbaar via de webapp.

Web: open een klus en ga naar Digitale meetbon. Vul gegevens, keuzes en ruiten in; sla op. De meetbon wordt via de bestaande bedrijfsauthenticatie per klus opgeslagen. Expo: open de elementenlijst van een klus en kies Digitale meetbon. Dezelfde meetbon is op beide beschikbaar. Ruiten in een meetbon zijn zelfstandige bonregels; ze maken geen elementen of bestellingen aan.

Losse Android-meetapp: open of maak een project. De digitale meetbon staat onder de projectgegevens en wordt op het toestel opgeslagen. De bestaande Ruiten bevatten hier de glasmaten. Projectgegevens wijzigen behoudt de meetbon. Deze losse app synchroniseert niet met de webapp.

Vóór uitrol van API/web/Expo: voer de database-migratie uit via `npm run migrate --workspace=@glaszetter/api`. Een klus met inhoud in een meetbon is beschermd tegen verwijderen. Een volledig lege opgeslagen bon blokkeert een verder lege klus niet; de bon verdwijnt dan via de bestaande cascade. Ook losse spaties en onbekende of onvolledige oudere bondata tellen uit voorzorg als inhoud. Er wordt geen productieomgeving automatisch gemigreerd.

Validatie: aantallen positief en geheel; breedte/hoogte positief in mm; maximaal 200 bonregels. Lege meetbonnen zijn toegestaan. Schilderwerk vraagt om klusfoto’s via de bestaande foto-interface.

## PDF van de ingevulde meetbon

Web: kies **Opslaan en PDF downloaden**. Expo: kies **Opslaan en PDF delen** en sla het document op of deel het via het systeemvenster. Beide knoppen slaan eerst de actuele invoer op; bij een mislukte opslag wordt geen PDF gedownload. Fouten laten de formulierinvoer staan. Expo web downloadt het bestand rechtstreeks.

De beveiligde route `GET /api/v1/jobs/:id/meetbon/pdf` exporteert uitsluitend een opgeslagen meetbon van het ingelogde bedrijf. Geen opgeslagen bon geeft 404. De PDF bevat alle velden, Ja/Nee-keuzes, ruiten met aantallen, maten in mm, glastype, opmerkingen, oppervlak per regel en totaal, en de laatste opslagtijd in Nederlandse tijd. Ruiten worden niet omgezet naar elementen of bestellingen.

Foto’s van de klus en de bijbehorende elementen komen in een bijlage. Elementfoto’s zijn met hun elementcode aangeduid, zonder een koppeling aan een bonregel te suggereren. JPG/PNG worden uit de bestaande objectopslag gelezen; externe foto-URL’s worden niet opgehaald. Maximaal 20 foto’s en 30 MiB beelddata worden ingesloten. Alle overige, ontbrekende of niet ondersteunde foto’s blijven met een duidelijke melding vermeld. Zonder foto’s blijft de export beschikbaar.

Uitrol: geen nieuwe migratie. Deploy API en web samen. Expo gebruikt nu `expo-file-system` en `expo-sharing` passend bij SDK 50 en vereist een nieuwe APK; de oude APK krijgt deze knop niet automatisch. De losse Android-meetapp heeft deze serverexport niet, omdat projecten alleen lokaal worden bewaard.

## Betrouwbare opslag (fase 2)

Voer vóór het starten `npm run migrate --workspace=@glaszetter/api` uit. Render doet dit al tijdens de build. De API controleert bij het starten de benodigde opslagtabel, kolomtypes, NOT NULL-eisen, primaire sleutel en cascade naar de klus. Bij een ontbrekende of onvolledige structuur opent de API geen poort en stopt met een migratie-instructie. De controle wijzigt geen bestaande gegevens en vervangt het migratiecommando niet.

PUT en DELETE van de meetbon accepteren maximaal 8 MiB JSON, pas na authenticatie. Dit dekt de 200 toegestane regels met maximaal 2000 tekens per tekst, inclusief JSON-escapes; 2 MiB was daarvoor onvoldoende. Andere JSON-routes houden hun bestaande limiet van 100 KiB. Een overschrijding geeft 413 met `REQUEST_TOO_LARGE`, ongeldige JSON geeft 400 met `INVALID_JSON`. NUL en ongeldige Unicode worden vóór opslag afgekeurd; geldige Unicode blijft toegestaan. Web en Expo behouden bij opslagfouten de invoer in het geopende formulier. Dit biedt nog geen herstel na sluiten of herstarten.

Web en Expo hebben **Meetbon verwijderen** met een expliciete bevestiging. De beveiligde DELETE-route verwacht de laatst geladen of succesvol opgeslagen meetbon als JSON. De database verwijdert uitsluitend de geladen versie van de bon van het ingelogde bedrijf. Een inmiddels gewijzigde bon geeft 409 `MEETBON_CHANGED`; er wordt dan niets verwijderd en de invoer blijft staan. De controle gebruikt een unieke versiecode; de volgorde van JSON-sleutels is niet relevant. Een reeds ontbrekende bon geeft 204. Verwijderen wist de bon en de niet-opgeslagen invoer na succes; klus, elementen, inmetingen, foto’s, offertes en facturen blijven staan. PDF-export geeft na verwijderen 404 totdat opnieuw een bon is opgeslagen.

## Bescherming tegen gegevensverlies (fase 1 opnieuw opgebouwd)

Migratie `1700000000012_meetbon-revision.cjs` voegt aan bestaande bonnen een unieke `revision` toe zonder hun inhoud te wijzigen. GET geeft die versiecode terug; een nog niet opgeslagen bon heeft `revision: null`. PUT en DELETE vereisen de geladen versiecode. PUT voert één voorwaardelijke insert of update uit en maakt bij iedere succesvolle opslag een nieuwe code. Een stale versie of een verzoek zonder versie krijgt 409 `MEETBON_CHANGED`. Een verwijderde bon kan met een oude versie niet terugkomen; opnieuw aanmaken krijgt een nieuwe unieke code. De startupcontrole vereist de nieuwe kolom.

Web en Expo houden bij een conflict de eigen invoer vast en halen de nieuwste bon op. Het vergelijkingsscherm voegt wijzigingen in verschillende velden samen; bij hetzelfde gewijzigde veld kiest de gebruiker expliciet eigen of nieuwste invoer. Gelijktijdig gewijzigde ruitlijsten worden als volledige lijsten vergeleken omdat regels nog geen vaste identifiers hebben. Na verwerken controleert de gebruiker de bon en slaat opnieuw op; een verdere serverwijziging levert opnieuw een conflict. Opslaan vóór PDF-export gebruikt dezelfde bescherming. Concept-herstel na sluiten van web/Expo valt buiten deze fase.

De losse Android-meetapp bewaart invoer en vinkjes bij iedere input/change automatisch als `meetbonDraft` binnen het project, los van de definitief opgeslagen bon. Project opslaan, ruit toevoegen, terugkeren en herstart bewaren dit concept. Een oude conceptbasis vervangt geen nieuwere opgeslagen bon. Expliciet opslaan vervangt de definitieve bon en verwijdert het concept in dezelfde lokale opslagactie. Een opslagfout meldt geen succes en behoudt de invoer zolang de app open blijft. Bij volle of onbruikbare toestelopslag kan herstel na afsluiten niet worden gegarandeerd. Er is geen serversynchronisatie.

Uitrol vereist eerst migratie 12 en daarna de bijgewerkte API, web en Expo-app. Laat de oude API niet gelijktijdig schrijven: die vernieuwt de versiecode niet en omzeilt daardoor de bescherming. Oude clients die geen versie terugsturen worden geweigerd en moeten bijgewerkt worden. Een rollback naar de oude API vereist een schrijfpauze of een expliciete acceptatie van het terugkerende overschrijfrisico; verwijder de meetbontabel nooit als codeherstel.

Validatie lokaal: 60 tests, typecontroles en volledige build (API, Next.js en Expo Android-export). De Android-export is geen installeerbare APK. Een visuele controle op een fysiek toestel en productiecontrole zijn nog niet uitgevoerd.
