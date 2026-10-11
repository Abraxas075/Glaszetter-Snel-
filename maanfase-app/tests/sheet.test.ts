import { describe, expect, it } from 'vitest';
import { analyze } from '../src/lib/cycle';
import { buildMoonTimeline, moonPhaseAngle } from '../src/lib/moon';
import { buildPdf } from '../src/lib/pdf';
import { COLORS, SHEET_H, SHEET_W, buildSheet, sheetMonths } from '../src/lib/sheet';
import { primsToSvg } from '../src/lib/sheetSvg';
import { zonedToUtc } from '../src/lib/tz';
import type { Logs, Profile } from '../src/lib/types';

const profile: Profile = { name: 'Zonna Kort', birthDate: '2003-01-14', birthTime: '21:12', birthPlace: 'Amsterdam', birthTz: 'Europe/Amsterdam', cycleLength: 28, periodLength: 5 };
const tz = 'Europe/Amsterdam';
const birthUtc = zonedToUtc(2003, 1, 14, 21, 12, tz);
const phase = moonPhaseAngle(birthUtc);
const moon = buildMoonTimeline(phase, new Date('2026-09-01T00:00:00Z'), new Date('2027-11-01T00:00:00Z'), tz, 'centered24');
const logs: Logs = { '2026-09-28': { flow: 'normaal' }, '2026-09-29': { flow: 'zwaar' }, '2026-10-10': { ovulation: true } };
const analysis = analyze(logs, profile, '2026-10-11');
const prims = buildSheet({ profile, birthUtc, phase, startYear: 2026, startMonth: 10, tz, moon, analysis });

describe('jaaroverzicht (A4 liggend)', () => {
  it('toont 12 maanden vanaf okt 2026', () => {
    const months = sheetMonths(2026, 10);
    expect(months[0]).toEqual({ y: 2026, m: 10 });
    expect(months[11]).toEqual({ y: 2027, m: 9 });
    const texts = prims.filter((p) => p.t === 'text').map((p) => (p as { s: string }).s);
    for (const name of ['Oktober 2026', 'Januari 2027', 'September 2027']) expect(texts).toContain(name);
  });

  it('bevat de kop met geboortefase 137°01′ en Kloktijd/Wereldtijd', () => {
    const texts = prims.filter((p) => p.t === 'text').map((p) => (p as { s: string }).s);
    expect(texts).toContain('Fase van de Maan 137°01′');
    expect(texts).toContain('Kloktijd 21:12');
    expect(texts).toContain('Wereldtijd 20:12');
    expect(texts).toContain('Maanfase Vruchtbaarheid Kalender');
  });

  it('heeft precies 12 rode vakken (één per maand) plus blauw, groen en nieuwe/volle maan', () => {
    const red = prims.filter((p) => p.t === 'rect' && p.fill === COLORS.moon && p.h === 8.5);
    expect(red).toHaveLength(12);
    expect(prims.some((p) => p.t === 'rect' && p.fill === COLORS.period)).toBe(true);
    expect(prims.some((p) => p.t === 'circle' && p.fill === COLORS.ovulation)).toBe(true);
    expect(prims.filter((p) => p.t === 'circle' && p.fill === COLORS.newMoon).length).toBeGreaterThanOrEqual(12);
    expect(prims.filter((p) => p.t === 'circle' && p.fill === COLORS.fullMoon).length).toBeGreaterThanOrEqual(12);
  });

  it('past binnen de pagina', () => {
    for (const p of prims) {
      if (p.t === 'rect') {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(SHEET_W + 0.001);
        expect(p.y + p.h).toBeLessThanOrEqual(SHEET_H + 0.001);
      }
      if (p.t === 'text') {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(SHEET_H);
      }
    }
  });

  it('genereert een geldige SVG en PDF van één A4-liggend pagina', async () => {
    const svg = primsToSvg(prims);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Oktober 2026');
    const doc = await buildPdf(prims, 'Test');
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(297, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 1);
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5000);
  });
});
