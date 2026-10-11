/**
 * Metingen uit de Astrodienst "Maanfase Vruchtbaarheid Kalender" (afbeelding van de gebruiker, 900×631 px):
 *   voor: Zonna Kort · geb. 14 januari 2003 · Kloktijd 21:12 · Wereldtijd 20:12 · Fase van de Maan 137°01′
 *   periode: oktober 2026 t/m september 2027, tijdschaal in UT.
 *
 * De afbeelding heeft drie rijen van vier maanden. Per rij is de x-as lineair in tijd (UT).
 * Alle waarden zijn gemiddelde pixelkolommen (x) van de getekende symbolen:
 *   - new/full: zwarte (nieuwe maan) en gele (volle maan) stippen, gebruikt om de x-as te kalibreren;
 *   - fertileBoxRight: laatste pixelkolom van het rode vak (het vak is 6 px breed ≈ 24 uur;
 *     het middelpunt is dus fertileBoxRight - 2,5).
 */
export interface RefRow {
  /** UTC-begin van de rij (00:00 UT op de 1e van de eerste maand). */
  startUtc: string;
  months: string[];
  /** x-positie van stippen, in volgorde van de tijd (nieuwe en volle maan per maand). */
  dots: { kind: 'new' | 'full'; x: number }[];
  fertileBoxRight: number[];
}

export const BIRTH = { date: '2003-01-14', time: '21:12', tz: 'Europe/Amsterdam', shownPhase: '137°01′', shownUt: '20:12' };

export const ROWS: RefRow[] = [
  {
    startUtc: '2026-10-01T00:00:00Z',
    months: ['2026-10', '2026-11', '2026-12', '2027-01'],
    dots: [
      { kind: 'new', x: 134.8 }, { kind: 'full', x: 233.1 },
      { kind: 'new', x: 322.7 }, { kind: 'full', x: 419.7 },
      { kind: 'new', x: 511.1 }, { kind: 'full', x: 606.5 },
      { kind: 'new', x: 700.2 }, { kind: 'full', x: 793.2 },
    ],
    fertileBoxRight: [214, 402, 589, 776],
  },
  {
    startUtc: '2027-02-01T00:00:00Z',
    months: ['2027-02', '2027-03', '2027-04', '2027-05'],
    dots: [
      { kind: 'new', x: 109.1 }, { kind: 'full', x: 200.1 },
      { kind: 'new', x: 297.9 }, { kind: 'full', x: 387.0 },
      { kind: 'new', x: 485.7 }, { kind: 'full', x: 574.0 },
      { kind: 'new', x: 672.3 }, { kind: 'full', x: 761.1 },
    ],
    fertileBoxRight: [183, 369, 555, 741],
  },
  {
    startUtc: '2027-06-01T00:00:00Z',
    months: ['2027-06', '2027-07', '2027-08', '2027-09'],
    dots: [
      { kind: 'new', x: 97.8 }, { kind: 'full', x: 187.9 },
      { kind: 'new', x: 283.4 }, { kind: 'full', x: 375.5 },
      { kind: 'new', x: 469.1 }, { kind: 'full', x: 563.8 },
      { kind: 'full', x: 751.8 }, { kind: 'new', x: 841.4 },
    ],
    fertileBoxRight: [166, 353, 541, 729],
  },
];

/** Breedte van het rode vak in pixels (≈ 24 uur). */
export const BOX_PX = 6;
