# Glaszetter Snel — aparte testomgeving

Status: lokaal voorbereid. Geen Render-resources, bucket of externe accounts aangemaakt; geen werkende test-URL beschikbaar. De branch moet eerst naar GitHub worden gepubliceerd. De templates gebruiken `fix/meetbon-opslag-20261003`, die alle lokale fasen moet bevatten. Gebruik niet de bestaande `render.yaml` als testconfiguratie.

## Wat is voorbereid

| Onderdeel | Testconfiguratie |
|---|---|
| Database | `glaszetter-db-test`, databasenaam `glaszetter_snel_test` |
| API | `glaszetter-api-test`, afzonderlijk gegenereerde JWT-sleutel |
| Testweb | `glaszetter-web-test`, met expliciet HTTPS-test-API-adres |
| Foto’s | Bestaande S3/R2-koppeling met aparte bucket `glaszetter-snel-test` en bucketgebonden sleutels |
| Testaccount | E-mailadres via beveiligde instelling; willekeurig gegenereerd wachtwoord, nooit in de code |
| Voorbeelddata | Fictieve klant, project, klus en bon met 2 × 875 × 484 mm HR++ = 0,847 m² |
| Updates | Automatische deployments staan uit |

Een leeg instellingenvoorbeeld staat in `deploy/test.env.example`. Een ingevulde lokale `deploy/test.env` wordt genegeerd door Git; hostingsinstellingen blijven de aanbevolen plek voor echte sleutels.

De scripts controleren APP_ENV, databasenaam, JWT-lengte, bucketnaam, foto-instellingen en HTTPS-origins vóór migreren, seeden en starten. Dit controleert configuratie; het bewijst niet zelfstandig dat credentials of een andere host fysiek een afzonderlijke database/bucket gebruiken. Verifieer resources en bucketrechten bij inrichting. Maak geen kopie van productieklanten of foto’s.

## Hostingkeuze vóór activering

De API- en webtemplates kiezen `plan: free` en Frankfurt. Render staat maximaal één gratis Postgres-database per workspace toe. Als productie die plek gebruikt, maak de testomgeving in een afzonderlijke geschikte workspace of kies bewust een andere database/een betaald plan en pas de template aan. Er is geen betaalde resource besteld. Gratis Render Postgres verloopt na 30 dagen en heeft geen beheerde backups; gebruik hem uitsluitend voor tijdelijke fictieve testdata. De werkelijke beschikbaarheid in jouw account is niet gecontroleerd.

Bronnen, gecontroleerd 4 oktober 2026:
- [Render Blueprint YAML](https://render.com/docs/blueprint-spec)
- [Render gratis diensten en databasebeperkingen](https://render.com/docs/free)

## Inrichtingsvolgorde

1. Publiceer de voorbereide branch met fase 1, fase 2, APK-build en testomgeving. Controleer de commit voordat je iets uitrolt.
2. Maak een aparte fotobucket `glaszetter-snel-test`. Maak eigen sleutels die uitsluitend die bucket mogen lezen, schrijven en verwijderen. Stel het test-publicatieadres voor foto’s in; gebruik alleen fictieve beelden. Gebruik geen productiesleutels. De template maakt de bucket niet automatisch aan.
3. Controleer dat de gekozen Render-workspace en de resourcenamen beschikbaar zijn. Render kan bij een reeds bestaande resourcenaam de configuratie daarop toepassen: importeer deze template niet bovenop een bestaande productie-resource.
4. Maak een nieuwe Blueprint met bestand `render.test.yaml`. Vul het test-e-mailadres, CORS-origin en de S3-instellingen in. JWT_SECRET en TEST_ADMIN_PASSWORD worden afzonderlijk gegenereerd. Lees het testwachtwoord alleen uit de beveiligde hostinginstellingen; zet het niet in GitHub, logs of een APK. Voor S3 zonder custom endpoint kan S3_ENDPOINT leeg blijven. Een eigen ANTHROPIC_API_KEY is alleen nodig voor het verwerken van gesproken inmetingen; zonder sleutel is dat onderdeel niet testbaar.
5. De build installeert de lockfile, compileert shared/API, voert de configuratiecontrole uit, draait alle migraties en maakt testgegevens transactioneel aan. Hij gebruikt `seed:test`, nooit de bestaande demo-seed met vast wachtwoord. Herhaalde uitrol laat bestaande testinvoer staan. Wachtwoordwijzigingen in de instellingen veranderen een bestaand account niet automatisch.
6. Controleer `/health` op het echte door Render toegekende API-adres. Ga niet uit van een voorspelde hostnaam. Migratie 12 en de schema/startcontrole moeten zijn geslaagd.
7. Maak de testweb-Blueprint met `render.test-web.yaml`. Vul `NEXT_PUBLIC_API_URL` in met de daadwerkelijke test-API-URL plus `/api/v1`. De webbuild weigert de bekende productie-API. Werk CORS_ORIGIN van de test-API bij naar de echte HTTPS-origin van de testwebdienst (geen pad of trailing slash). De API blijft zolang bruikbaar vanuit een native APK; CORS begrenst browserverzoeken.
8. Meld aan met het testaccount en noteer het testklus-ID. De seed meldt het UUID, geen wachtwoord. Gebruik de read-only controle uit `apps/mobile/README.md`. Een GET met versiecode bewijst nog niet de volledige conflictflow.
9. Vul `APK_TEST_API_URL` als repositoryvariabele in of geef de URL op bij de APK-workflow. Bouw de APK vanaf dezelfde voorbereide branch en controleer het commit-ID en de hash bij het artifact.
10. Test gelijktijdig opslaan vanaf testweb en APK, bewerken van ruiten, verwijderen en opnieuw aanmaken, foto-upload en PDF. Controleer dat de productieomgeving geen testgegevens heeft ontvangen.

De API vereist aanmelding voor werkgegevens. Render-webdiensten hebben een publiek bereikbaar adres; dat is geen volledig private netwerkhosting. Er wordt met dit voorbereidingsbestand niets gepubliceerd. Gebruik uitsluitend het afgeschermde testaccount en fictieve data.

## Herstellen en stoppen

Bij een mislukte migratie/seed: stop en herstel de testconfiguratie. De seed gebruikt één transactie en maakt geen half account bij een fout. Er worden geen database-reset of DROP-commando’s uitgevoerd. Rerun alleen op de bedoelde testdatabase. Voer geen `migrate:down` uit als algemene probleemoplossing.

Bij een defecte testversie: zet de test-API tijdelijk stil voor writes en deploy de laatste gevalideerde testcommit. Behoud meetbons en hun revision-kolom. Een oudere API kan de versiecontrole omzeilen; rol niet onbeschermd terug naar productiecode. Testresources kun je pas opruimen nadat eventuele relevante testresultaten zijn veiliggesteld. Stoppen van testservices wijzigt de productieconfiguratie niet.

## Lokale verificatie

66 tests, typecontroles en API-build zijn geslaagd. Ook echte API-login met het testaccount, laden van een bon met versiecode en CORS voor testweb zijn lokaal getest. De tests bouwen alle echte migraties in een wegwerp-PostgreSQL-database, controleren de schema/startvoorwaarden, maken een account met werkende wachtwoordhash en een bon met versiecode, controleren dat reseeding edits behoudt en testen rollback van een mislukte seed. Configuratiecontroles weigeren productiedatabasenamen en onvolledige foto-instellingen vóór queries.

De YAML is lokaal geparset en de verwijzingen zijn gecontroleerd. Render-servervalidatie, werkelijke provisioning, HTTPS, S3-rechten, login op Render en fysieke telefoontests zijn nog niet uitgevoerd.
