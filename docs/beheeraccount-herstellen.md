# Bestaand beheeraccount herstellen

Dit handmatig gestarte hulpmiddel vervangt alleen het wachtwoord van één bestaand beheeraccount. Er is geen openbare herstelroute en het wordt nooit automatisch door een deployment, migratie of seed uitgevoerd. Het maakt geen bedrijf of account aan. Klussen, meetbonnen, leveranciers, bestelgegevens, rollen en medewerkers blijven behouden.

## Voorbereid voor Glaszetter Snel

- E-mail: `admin@glaszettersnel.nl`
- Bedrijf: `Glaszetter Snel Demo`
- Bedrijf-ID: `5220781f-633a-453e-93a2-74f9b5235a44`
- Gebruiker-ID: `7290682d-a26c-4954-b37a-cae950a49929`

## Vanaf Windows (PowerShell)

Gebruik je eigen computer met Node.js 20 of hoger en een gecontroleerde checkout van deze repository. Open PowerShell in de hoofdmap en voer uit:

```powershell
npm ci --include=dev
npm run build -w packages/shared -w packages/api
npm run recover:owner -w packages/api -- --email admin@glaszettersnel.nl --company-id 5220781f-633a-453e-93a2-74f9b5235a44 --user-id 7290682d-a26c-4954-b37a-cae950a49929
```

Het hulpmiddel vraagt om de externe verbindings-URL van de bestaande productiedatabase. Haal deze uit Render → glaszetter-db → Connect → External. Voer de URL uitsluitend in de verborgen terminalprompt in. Deel hem niet in chat, screenshots, code of opdrachtregelargumenten. Een bestaande DATABASE_URL wordt gebruikt als die al in deze terminal is ingesteld. Controleer dan dat deze naar de bedoelde productieomgeving verwijst.

Controleer het getoonde bedrijf, gebruiker-ID en e-mailadres. Typ het e-mailadres ter bevestiging. Voer daarna zelf een nieuw uniek wachtwoord van minstens 16 tekens in en herhaal dit. De invoer is onzichtbaar; er verschijnen ook geen sterretjes. De bovengrens is 72 UTF-8-bytes vanwege bcrypt. Ctrl+C of een onjuiste bevestiging breekt het herstel af.

Voer deze opdracht niet uit met een pipe, invoerbestand of schermopname. Het hulpmiddel weigert niet-interactieve invoer. De databaseverbinding vereist TLS met een geldig certificaat. Verlaag TLS-controles of netwerkbeveiliging niet wanneer verbinden mislukt; stop dan en onderzoek de verbinding.

## Vanaf Render Shell, indien beschikbaar

Een betaald webservice-instance ondersteunt Shell; een Free instance niet. Het workspace-abonnement verandert dit niet: https://render.com/docs/ssh en https://render.com/docs/free . Er is geen upgrade nodig voor de Windows-route. In een bestaande geschikte Shell kan dezelfde herstelopdracht worden gebruikt; de service levert DATABASE_URL. Wijzig niet de build- of startopdracht om herstel automatisch te starten.

## Controle na herstel

1. Meld je aan op https://glaszetter-snel-web.vercel.app/login met het beheer-e-mailadres en het zelf ingevoerde nieuwe wachtwoord.
2. Controleer je bestaande klussen, meetbonnen en medewerkers.
3. Open Bestellingen → TEST AMS-04, bestelnummer GS-2026-003. Kies Vandaglas Amsterdam West bij bestelgegevens en sla op.
4. Heropen de bestelling, controleer de opgeslagen leverancier en maak de PDF-bestelbon.

Herstel verandert geen bestaande JWT-sessies: die verlopen uiterlijk zeven dagen na uitgifte. Dit hulpmiddel is geen sessie-intrekking. Bij vermoeden van misbruik moet ook intrekking van sessies worden geregeld. Een tweede uitvoering met hetzelfde nieuwe wachtwoord stopt zonder wijziging.

Het herstel is pas uitgevoerd nadat de terminal expliciet succes meldt. Tot die tijd blijft het huidige wachtwoord bestaan. Er is geen nieuw wachtwoord in dit document of de repository opgeslagen.
