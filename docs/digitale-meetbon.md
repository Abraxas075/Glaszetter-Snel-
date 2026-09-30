# Digitale meetbon

Bron: Meetbon Glaszettersnel digitaal.xlsx, tabblad Glaszettersnel. Blad2 is leeg. Het originele bestand blijft ongewijzigd beschikbaar via de webapp.

Web: open een klus en ga naar Digitale meetbon. Vul gegevens, keuzes en ruiten in; sla op. De meetbon wordt via de bestaande bedrijfsauthenticatie per klus opgeslagen. Expo: open de elementenlijst van een klus en kies Digitale meetbon. Dezelfde meetbon is op beide beschikbaar. Ruiten in een meetbon zijn zelfstandige bonregels; ze maken geen elementen of bestellingen aan.

Losse Android-meetapp: open of maak een project. De digitale meetbon staat onder de projectgegevens en wordt op het toestel opgeslagen. De bestaande Ruiten bevatten hier de glasmaten. Projectgegevens wijzigen behoudt de meetbon. Deze losse app synchroniseert niet met de webapp.

Vóór uitrol van API/web/Expo: voer de database-migratie uit via `npm run migrate --workspace=@glaszetter/api`. Een klus met een opgeslagen meetbon is beschermd tegen verwijderen. Er wordt geen productieomgeving automatisch gemigreerd.

Validatie: aantallen positief en geheel; breedte/hoogte positief in mm; maximaal 200 bonregels. Lege meetbonnen zijn toegestaan. Schilderwerk vraagt om klusfoto’s via de bestaande foto-interface.
