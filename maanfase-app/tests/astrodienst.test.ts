import { describe, expect, it } from 'vitest';
import { findFertileMoments, findMoonQuarters, formatPhase, moonPhaseAngle, phaseFromParts, splitDegrees } from '../src/lib/moon';
import { zonedToUtc } from '../src/lib/tz';
import { BIRTH, BOX_PX, ROWS } from './fixtures/astrodienst-reference';

const HOUR = 3_600_000;
const birthUtc = zonedToUtc(2003, 1, 14, 21, 12, BIRTH.tz);
const birthPhase = moonPhaseAngle(birthUtc);

/** Lineaire fit x = a + b·uren over de maanstippen van één rij (kleinste kwadraten). */
function calibrate(startUtc: Date, anchors: { hours: number; x: number }[]) {
  const n = anchors.length;
  const sx = anchors.reduce((s, p) => s + p.hours, 0);
  const sy = anchors.reduce((s, p) => s + p.x, 0);
  const sxx = anchors.reduce((s, p) => s + p.hours * p.hours, 0);
  const sxy = anchors.reduce((s, p) => s + p.hours * p.x, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  const resid = anchors.map((p) => p.x - (a + b * p.hours));
  return { a, b, resid, startUtc };
}

describe('Astrodienst-kalender: geboortefase', () => {
  it('geboorte 14-01-2003 21:12 Amsterdam = 20:12 UT', () => {
    expect(birthUtc.toISOString()).toBe('2003-01-14T20:12:00.000Z');
  });

  it(`fase van de maan = ${BIRTH.shownPhase}`, () => {
    expect(formatPhase(birthPhase)).toBe(BIRTH.shownPhase);
    const { deg } = splitDegrees(birthPhase);
    expect(deg).toBe(137);
    // binnen 1 boogminuut van de getoonde 137°01′
    expect(Math.abs(birthPhase - phaseFromParts(137, 1))).toBeLessThan(1 / 60);
  });
});

describe('Astrodienst-kalender: nieuwe/volle maan en rode vakken (okt 2026 – sep 2027)', () => {
  const firstStart = new Date(ROWS[0].startUtc);
  const lastEnd = new Date('2027-10-01T00:00:00Z');
  const quarters = findMoonQuarters(firstStart, lastEnd).filter((q) => q.kind === 'new' || q.kind === 'full');
  const fertile = findFertileMoments(birthPhase, firstStart, lastEnd);

  ROWS.forEach((row, ri) => {
    const start = new Date(row.startUtc);
    const rowEnd = ROWS[ri + 1] ? new Date(ROWS[ri + 1].startUtc) : lastEnd;

    // koppel elke stip aan de dichtstbijzijnde berekende gebeurtenis van dezelfde soort
    const anchors = row.dots.map((d) => {
      const candidates = quarters.filter((q) => q.kind === d.kind && q.time >= start && q.time <= rowEnd);
      return { d, candidates };
    });

    it(`rij ${ri + 1}: elke stip heeft een berekende ${'nieuwe/volle maan'} in de juiste maand`, () => {
      for (const a of anchors) expect(a.candidates.length).toBeGreaterThan(0);
    });

    // greedy volgorde-koppeling: stip i <-> i-de gebeurtenis in tijd
    const events = quarters.filter((q) => q.time >= start && q.time < rowEnd);
    const matched: { hours: number; x: number }[] = [];
    let ei = 0;
    for (const d of row.dots) {
      while (ei < events.length && events[ei].kind !== d.kind) ei++;
      if (ei >= events.length) break;
      matched.push({ hours: (events[ei].time.getTime() - start.getTime()) / HOUR, x: d.x });
      ei++;
    }
    const cal = calibrate(start, matched);

    it(`rij ${ri + 1}: x-as is lineair in UT met ~6,3 px/dag (stippen binnen 1 px van de berekening)`, () => {
      expect(matched.length).toBe(row.dots.length);
      expect(cal.b * 24).toBeGreaterThan(6.2);
      expect(cal.b * 24).toBeLessThan(6.5);
      for (const r of cal.resid) expect(Math.abs(r)).toBeLessThan(1.0);
    });

    row.fertileBoxRight.forEach((right, mi) => {
      it(`${row.months[mi]}: rood vak valt rond het berekende moment (binnen ±1 px ≈ 4 uur)`, () => {
        const centerX = right - (BOX_PX - 1) / 2;
        const centerUtc = new Date(start.getTime() + ((centerX - cal.a) / cal.b) * HOUR);
        const nearest = fertile.reduce((best, f) => (Math.abs(f.moment.getTime() - centerUtc.getTime()) < Math.abs(best.moment.getTime() - centerUtc.getTime()) ? f : best));
        const diffH = (centerUtc.getTime() - nearest.moment.getTime()) / HOUR;
        // eslint-disable-next-line no-console
        console.log(`${row.months[mi]}  Astrodienst-vak ≈ ${centerUtc.toISOString().slice(0, 16)}Z  berekend ${nearest.moment.toISOString().slice(0, 16)}Z  Δ ${diffH.toFixed(1)} u`);
        expect(Math.abs(diffH)).toBeLessThan(4.5);
      });
    });
  });

  it('er zijn precies 12 maanfase-momenten in okt 2026 – sep 2027, één per afgebeelde maand', () => {
    const inRange = fertile.filter((f) => f.moment >= firstStart && f.moment < lastEnd);
    expect(inRange.length).toBe(12);
    const months = inRange.map((f) => f.moment.toISOString().slice(0, 7));
    expect(months).toEqual(ROWS.flatMap((r) => r.months));
  });

  it('het rode vak in Astrodienst is gecentreerd op het moment (±12 uur), niet 24 uur ervoor', () => {
    // gemiddeld verschil tussen vak-midden en moment ≈ 0 (en dus niet ≈ -12 uur zoals bij 'tot het moment')
    const diffs: number[] = [];
    ROWS.forEach((row, ri) => {
      const start = new Date(row.startUtc);
      const rowEnd = ROWS[ri + 1] ? new Date(ROWS[ri + 1].startUtc) : lastEnd;
      const events = quarters.filter((q) => q.time >= start && q.time < rowEnd);
      const matched: { hours: number; x: number }[] = [];
      let ei = 0;
      for (const d of row.dots) {
        while (ei < events.length && events[ei].kind !== d.kind) ei++;
        matched.push({ hours: (events[ei].time.getTime() - start.getTime()) / HOUR, x: d.x });
        ei++;
      }
      const cal = calibrate(start, matched);
      row.fertileBoxRight.forEach((right) => {
        const centerUtc = new Date(start.getTime() + (((right - 2.5) - cal.a) / cal.b) * HOUR);
        const nearest = fertile.reduce((best, f) => (Math.abs(f.moment.getTime() - centerUtc.getTime()) < Math.abs(best.moment.getTime() - centerUtc.getTime()) ? f : best));
        diffs.push((centerUtc.getTime() - nearest.moment.getTime()) / HOUR);
      });
    });
    const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
    // eslint-disable-next-line no-console
    console.log(`gemiddeld verschil vak-midden − moment: ${mean.toFixed(2)} u (n=${diffs.length})`);
    expect(Math.abs(mean)).toBeLessThan(2);
  });
});
