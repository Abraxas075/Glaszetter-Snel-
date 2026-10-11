# Maanfase Cyclus

Mobielvriendelijke PWA (Nederlands) om menstruatie en ovulatie bij te houden, samen met een
maanfase-vruchtbaarheidskalender volgens de methode Jonas. React + Tailwind, werkt offline,
alle gegevens blijven lokaal op het apparaat (localStorage), geen account nodig.

> De maanfase-methode (Jonas) is niet wetenschappelijk bewezen. Deze app is géén anticonceptiemiddel
> en geen medisch hulpmiddel. Neem bij twijfel of klachten contact op met je huisarts.

## Starten

```bash
cd maanfase-app
npm install
npm run dev        # ontwikkelen
npm run build      # productiebuild in dist/ (incl. service worker voor offline gebruik)
npm run preview    # build lokaal bekijken
npm test           # unit tests
```

De build gebruikt relatieve paden en kan dus op elk subpad of domein worden gehost (bv. GitHub Pages).
Installeren op de telefoon: open de site in Chrome/Safari en kies "Toevoegen aan beginscherm".

## Wat zit erin

- **Profiel**: naam, geboortedatum/-tijd/-tijdzone → persoonlijke geboortefase (hoek zon–maan, bv. 137°01′).
  Optioneel de hoek handmatig invullen (bijv. uit Astrodienst).
- **Kalender** (maand en jaar): blauw = menstruatie, groen = ovulatie, rood = maanfase-vruchtbaar,
  arcering = verwacht vruchtbaar venster (ovulatie −5 t/m +1 dag), zwarte/gele stip = nieuwe/volle maan,
  zonneteken per maand. Legenda altijd zichtbaar.
- **Dagboek**: menstruatie (start/einde/hevigheid), ovulatietest, basale temperatuur, cervixslijm,
  klachten, stemming, energie, notitie.
- **Voorspellingen**: volgende menstruatie/ovulatie/vruchtbaar venster, steeds nauwkeuriger uit eigen
  cycli (cycluslengte, lutale fase, ovulatie uit markering, ovulatietest of temperatuurverschuiving
  "3 boven 6"); maanfase-vruchtbare dagen voor de komende 12 maanden.
- **Overzicht**: gemiddelde cycluslengte, regelmaat, temperatuurgrafiek en een vergelijking van je
  ovulatie met je maanfase-dag (inclusief de kans op toevallige treffers).
- **Meldingen** (optioneel), **pincode** (optioneel), **back-up** via JSON-bestand, **donkere modus**.
- **PDF-export**: jaaroverzicht van 12 maanden op één A4 liggend in de stijl van een maanfase-kalender.

## Berekening

`src/lib/moon.ts` gebruikt [astronomy-engine](https://github.com/cosinekitty/astronomy):
fasehoek = ecliptische lengte maan − zon (`MoonPhase`); de momenten waarop de maan weer dezelfde hoek
heeft komen uit `SearchMoonPhase`. Dagen worden ingedeeld in Europe/Amsterdam (instelbaar).

Het rode venster is instelbaar (Meer → Kalender):

- **24 uur ervoor**: van 24 uur vóór het exacte moment tot het moment (standaard, zoals in de opdracht);
- **±12 uur**: 12 uur vóór tot 12 uur na het moment. Zo is het rode vak getekend in de Astrodienst-kalender.

### Controle met de Astrodienst-kalender

`tests/astrodienst.test.ts` vergelijkt de berekening met de Astrodienst-kalender van okt 2026 – sep 2027
(geb. 14-01-2003 21:12, Wereldtijd 20:12, fase 137°01′). De pixelposities van de stippen (nieuwe/volle
maan) en de 12 rode vakken staan in `tests/fixtures/astrodienst-reference.ts`; de x-as wordt per rij
gekalibreerd op de maanstippen. Resultaat: geboortefase 137°01′, alle 12 rode vakken vallen binnen
±2 uur (pixelnauwkeurigheid) van het berekende moment, en het vak staat gecentreerd op dat moment.

```bash
npm run verify:astrodienst
```

## Meldingen en privacy

Er is geen server. Meldingen verschijnen wanneer de app geopend wordt en, in een geïnstalleerde app in
Chrome op Android, af en toe op de achtergrond (Periodic Background Sync). De pincode is een schermslot
(PBKDF2-hash); de opgeslagen gegevens zelf worden niet versleuteld. Back-ups bevatten nooit de pincode.
