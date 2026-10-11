import { type DayKey, addDays, addMonths, daysInMonth, formatDayLong, formatMonthYear, isSunday, makeKey, parseKey } from './dates';
import type { CycleAnalysis } from './cycle';
import { formatPhase, type MoonTimeline } from './moon';
import { dayFraction, dayKeyInTz, dayStartUtc, formatTimeInTz } from './tz';
import { SIGNS, sunIngresses, sunSignIndex } from './zodiac';
import type { Profile } from './types';

/** Tekenprimitieven in millimeters (A4 liggend 297 × 210). Gebruikt door de SVG-voorvertoning én de PDF. */
export type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: number[] }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number; dash?: number[] }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | { t: 'text'; x: number; y: number; s: string; size: number; bold?: boolean; anchor?: 'start' | 'middle' | 'end'; fill?: string };

export const SHEET_W = 297;
export const SHEET_H = 210;

export const COLORS = {
  ink: '#111111',
  grid: '#7fe8f0',
  gridLight: '#c8f5f8',
  period: '#2f6fe0',
  periodLight: '#bcd3fa',
  ovulation: '#1fa65f',
  ovulationLight: '#bdebd2',
  fertileLight: '#e4f6ec',
  moon: '#e02424',
  newMoon: '#111111',
  fullMoon: '#f2c200',
  muted: '#555555',
} as const;

export interface SheetInput {
  profile: Profile;
  birthUtc: Date;
  phase: number;
  startYear: number;
  startMonth: number;
  tz: string;
  moon: MoonTimeline;
  analysis: CycleAnalysis;
}

export function sheetMonths(startYear: number, startMonth: number): { y: number; m: number }[] {
  return Array.from({ length: 12 }, (_, i) => addMonths(startYear, startMonth, i));
}

const MARGIN = 10;
const COLS = 4;
const GAP = 3;
const PANEL_W = (SHEET_W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
const TOP0 = 38;
const ROW_H = 53;
const STRIP_H = 39;
const AXIS_FROM_TOP = 17;

export function buildSheet(input: SheetInput): Prim[] {
  const { profile, birthUtc, phase, tz, moon, analysis } = input;
  const p: Prim[] = [];

  /* ---------- kop ---------- */
  p.push({ t: 'text', x: MARGIN, y: 18, s: 'Maanfase Vruchtbaarheid Kalender', size: 21, bold: true });
  const subtitle = profile.name ? `voor ${profile.name}` : 'persoonlijke maanfase-kalender';
  p.push({ t: 'text', x: MARGIN, y: 24.5, s: subtitle, size: 9 });
  p.push({ t: 'text', x: MARGIN, y: 29, s: `geb. op ${formatDayLong(profile.birthDate)}`, size: 9, fill: '#1f4fd0' });
  const local = profile.birthTime;
  const ut = formatTimeInTz(birthUtc, 'UTC');
  p.push({ t: 'text', x: 118, y: 24.5, s: `Kloktijd ${local}`, size: 9 });
  p.push({ t: 'text', x: 118, y: 29, s: `Wereldtijd ${ut}`, size: 9 });
  p.push({ t: 'text', x: 168, y: 29, s: `Fase van de Maan ${formatPhase(phase)}`, size: 9 });

  /* legenda rechtsboven */
  const lx = 222;
  p.push({ t: 'rect', x: lx, y: 6, w: 65, h: 29, stroke: COLORS.ink, sw: 0.25 });
  const legend: { c: string; label: string; kind: 'rect' | 'dash' | 'dot'; stroke?: string }[] = [
    { c: COLORS.period, label: 'menstruatie', kind: 'rect' },
    { c: COLORS.ovulation, label: 'ovulatie', kind: 'rect' },
    { c: COLORS.moon, label: 'maanfase-vruchtbaar (Jonas)', kind: 'rect' },
    { c: COLORS.fertileLight, label: 'vruchtbaar venster (verwacht)', kind: 'dash' },
    { c: COLORS.newMoon, label: 'nieuwe maan', kind: 'dot' },
    { c: COLORS.fullMoon, label: 'volle maan', kind: 'dot', stroke: '#a88a00' },
  ];
  legend.forEach((it, i) => {
    const y = 10.6 + i * 4.5;
    if (it.kind === 'dot') p.push({ t: 'circle', cx: lx + 6, cy: y - 1.1, r: 1.1, fill: it.c, stroke: it.stroke, sw: 0.15 });
    else
      p.push({
        t: 'rect', x: lx + 3, y: y - 2.7, w: 6, h: 3.2, fill: it.c,
        stroke: it.kind === 'dash' ? COLORS.ovulation : undefined, sw: 0.2, dash: it.kind === 'dash' ? [0.8, 0.5] : undefined,
      });
    p.push({ t: 'text', x: lx + 12, y, s: it.label, size: 6.5 });
  });

  /* ---------- 12 maandpanelen ---------- */
  sheetMonths(input.startYear, input.startMonth).forEach(({ y, m }, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x0 = MARGIN + col * (PANEL_W + GAP);
    const top = TOP0 + row * ROW_H + 5;
    drawMonth(p, { y, m, x0, top, tz, moon, analysis });
  });

  /* ---------- voet ---------- */
  const fy = SHEET_H - 12;
  const foot = [
    'Tijdschaal: streepjes voor elke dag om 0:00 uur (Nederlandse tijd); dagnummers staan bij de zondagen. De rode vakken geven de vruchtbare dagen volgens de maanfase-methode (Jonas) aan.',
    'Blauw = menstruatie, groen = ovulatie, lichtgroen = verwacht vruchtbaar venster uit de biologische cyclus. Markeer zelf regelmatig het begin en de duur van de menstruatie en de ovulatie.',
    'De maanfase-methode (Jonas) is niet wetenschappelijk bewezen. Deze kalender is geen anticonceptiemiddel en geen medisch hulpmiddel. Neem bij twijfel of klachten contact op met je huisarts.',
  ];
  foot.forEach((s, i) => p.push({ t: 'text', x: MARGIN, y: fy + i * 3.6, s, size: 5.8, fill: COLORS.muted }));
  return p;
}

interface MonthArgs {
  y: number;
  m: number;
  x0: number;
  top: number;
  tz: string;
  moon: MoonTimeline;
  analysis: CycleAnalysis;
}

function drawMonth(p: Prim[], a: MonthArgs) {
  const { y, m, x0, top, tz, moon, analysis } = a;
  const nd = daysInMonth(y, m);
  const dayW = PANEL_W / nd;
  const axis = top + AXIS_FROM_TOP;
  const bottom = top + STRIP_H;
  const key = (d: number): DayKey => makeKey(y, m, d);
  const first = key(1);
  const monthStart = dayStartUtc(first, tz);
  const monthEnd = dayStartUtc(addDays(key(nd), 1), tz);

  /** Positie in mm binnen het paneel voor een UTC-moment (0 .. PANEL_W). */
  const posOf = (t: Date): number => {
    if (t <= monthStart) return 0;
    if (t >= monthEnd) return PANEL_W;
    const k = dayKeyInTz(t, tz);
    const idx = parseKey(k).d - 1;
    return (idx + dayFraction(t, k, tz)) * dayW;
  };

  /* raster */
  for (let r = 0; r <= 10; r++) {
    const yy = top + (STRIP_H / 10) * r;
    p.push({ t: 'line', x1: x0, y1: yy, x2: x0 + PANEL_W, y2: yy, stroke: COLORS.grid, sw: 0.12 });
  }
  for (let d = 0; d <= nd; d++) {
    p.push({ t: 'line', x1: x0 + d * dayW, y1: top, x2: x0 + d * dayW, y2: bottom, stroke: COLORS.grid, sw: d % 7 === 0 ? 0.18 : 0.12 });
  }
  p.push({ t: 'rect', x: x0, y: top, w: PANEL_W, h: STRIP_H, stroke: COLORS.ink, sw: 0.25 });

  /* weekdagen: zondagen een lichte kleur + dagnummer */
  for (let d = 1; d <= nd; d++) {
    if (isSunday(key(d))) {
      p.push({ t: 'text', x: x0 + (d - 0.5) * dayW, y: axis + 3.4, s: String(d), size: 5.2, bold: true, anchor: 'middle' });
    }
  }

  /* banen onder de as: menstruatie / ovulatie / vruchtbaar venster */
  const laneTop = axis + 5;
  const laneH = (bottom - laneTop) / 3;
  const lanes = { period: laneTop, ovulation: laneTop + laneH, fertile: laneTop + 2 * laneH };
  for (let d = 1; d <= nd; d++) {
    const mk = analysis.marks.get(key(d));
    if (!mk) continue;
    const xx = x0 + (d - 1) * dayW;
    if (mk.fertile) {
      p.push(
        mk.fertile === 'actual'
          ? { t: 'rect', x: xx, y: lanes.fertile, w: dayW, h: laneH, fill: COLORS.ovulationLight }
          : { t: 'rect', x: xx, y: lanes.fertile, w: dayW, h: laneH, fill: COLORS.fertileLight, stroke: COLORS.ovulation, sw: 0.1, dash: [0.6, 0.4] },
      );
    }
    if (mk.period) {
      p.push(
        mk.period === 'actual'
          ? { t: 'rect', x: xx, y: lanes.period, w: dayW, h: laneH, fill: COLORS.period }
          : { t: 'rect', x: xx, y: lanes.period, w: dayW, h: laneH, fill: COLORS.periodLight, stroke: COLORS.period, sw: 0.1, dash: [0.6, 0.4] },
      );
    }
    if (mk.ovulation) {
      const cx = xx + dayW / 2;
      const cy = lanes.ovulation + laneH / 2;
      const r = Math.min(laneH, dayW) * 0.46;
      p.push(
        mk.ovulation === 'actual'
          ? { t: 'circle', cx, cy, r, fill: COLORS.ovulation }
          : { t: 'circle', cx, cy, r, fill: mk.ovulation === 'estimated' ? COLORS.ovulationLight : '#ffffff', stroke: COLORS.ovulation, sw: 0.25 },
      );
    }
  }
  [lanes.ovulation, lanes.fertile].forEach((yy) => p.push({ t: 'line', x1: x0, y1: yy, x2: x0 + PANEL_W, y2: yy, stroke: COLORS.grid, sw: 0.2 }));

  /* as met streepjes voor elke dag */
  p.push({ t: 'line', x1: x0, y1: axis, x2: x0 + PANEL_W, y2: axis, stroke: COLORS.ink, sw: 0.45 });
  for (let d = 0; d < nd; d++) {
    const big = isSunday(key(d + 1));
    p.push({ t: 'line', x1: x0 + d * dayW, y1: axis - (big ? 1.6 : 0.9), x2: x0 + d * dayW, y2: axis, stroke: COLORS.ink, sw: 0.2 });
  }

  /* rode vakken: vruchtbare dagen volgens de maanfase */
  for (const f of moon.fertile) {
    if (f.end <= monthStart || f.start >= monthEnd) continue;
    const xa = x0 + posOf(f.start < monthStart ? monthStart : f.start);
    const xb = x0 + posOf(f.end > monthEnd ? monthEnd : f.end);
    p.push({ t: 'rect', x: xa, y: axis - 10.5, w: Math.max(0.4, xb - xa), h: 8.5, fill: COLORS.moon });
    if (f.moment >= monthStart && f.moment < monthEnd) {
      const xm = x0 + posOf(f.moment);
      p.push({ t: 'line', x1: xm, y1: axis - 12.5, x2: xm, y2: axis - 2, stroke: COLORS.moon, sw: 0.25 });
    }
  }

  /* nieuwe en volle maan op de as */
  for (const q of moon.quarters) {
    if (q.time < monthStart || q.time >= monthEnd) continue;
    const xx = x0 + posOf(q.time);
    if (q.kind === 'new') p.push({ t: 'circle', cx: xx, cy: axis - 1.7, r: 1, fill: COLORS.newMoon });
    if (q.kind === 'full') p.push({ t: 'circle', cx: xx, cy: axis - 1.7, r: 1, fill: COLORS.fullMoon, stroke: '#a88a00', sw: 0.15 });
  }

  /* sterrenbeeld van de zon */
  const ing = sunIngresses(new Date(monthStart.getTime() - 86_400_000), monthEnd).find((i) => i.time >= monthStart && i.time < monthEnd);
  const startSign = sunSignIndex(monthStart);
  const signY = top - 1.4;
  if (ing) {
    const xx = x0 + posOf(ing.time);
    p.push({ t: 'line', x1: xx, y1: signY - 3.2, x2: xx, y2: top + STRIP_H * 0.5, stroke: COLORS.ink, sw: 0.25, dash: [1.2, 0.8] });
    p.push({ t: 'text', x: xx + 0.8, y: signY, s: SIGNS[ing.signIndex].name, size: 6.5, bold: true });
    if (xx - x0 > 17) p.push({ t: 'text', x: x0 + 0.8, y: signY, s: SIGNS[(ing.signIndex + 11) % 12].name, size: 5.5, fill: COLORS.muted });
  } else {
    p.push({ t: 'text', x: x0 + 0.8, y: signY, s: SIGNS[startSign].name, size: 6.5, bold: true });
  }

  /* maandnaam */
  p.push({ t: 'text', x: x0, y: bottom + 4.2, s: formatMonthYear(y, m), size: 8.5, bold: true });
}
