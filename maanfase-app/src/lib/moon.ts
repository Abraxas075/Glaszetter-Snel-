import * as Astronomy from 'astronomy-engine';
import { type DayKey, addDays } from './dates';
import { dayKeyInTz, dayStartUtc, dayEndUtc } from './tz';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Fasehoek van de maan: ecliptische lengte maan min zon (0° = nieuwe maan, 180° = volle maan). */
export function moonPhaseAngle(date: Date): number {
  return Astronomy.MoonPhase(date);
}

/** Hoek in graden + boogminuten, bv. 137.0167 -> { deg: 137, min: 1 }. */
export function splitDegrees(angle: number): { deg: number; min: number } {
  const total = Math.round(((angle % 360) + 360) % 360 * 60);
  const t = total % (360 * 60);
  return { deg: Math.floor(t / 60), min: t % 60 };
}

/** '137°01′' zoals in de Astrodienst-kalender. */
export function formatPhase(angle: number): string {
  const { deg, min } = splitDegrees(angle);
  return `${deg}°${String(min).padStart(2, '0')}′`;
}

export function phaseFromParts(deg: number, min: number): number {
  return (((deg + min / 60) % 360) + 360) % 360;
}

export function phaseName(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return 'Nieuwe maan';
  if (a < 67.5) return 'Wassende sikkel';
  if (a < 112.5) return 'Eerste kwartier';
  if (a < 157.5) return 'Wassende maan';
  if (a < 202.5) return 'Volle maan';
  if (a < 247.5) return 'Afnemende maan';
  if (a < 292.5) return 'Laatste kwartier';
  return 'Afnemende sikkel';
}

/**
 * Hoe het rode venster rond het exacte moment ligt:
 * - 'before24': 24 uur vóór het moment tot het moment zelf (zoals in de opdracht);
 * - 'centered24': 12 uur vóór tot 12 uur na het moment (zoals het rode vak in de Astrodienst-kalender).
 */
export type WindowMode = 'before24' | 'centered24';

export const WINDOW_HOURS: Record<WindowMode, { before: number; after: number }> = {
  before24: { before: 24, after: 0 },
  centered24: { before: 12, after: 12 },
};

export interface FertileMoment {
  /** Moment waarop de maan dezelfde fasehoek heeft als bij de geboorte. */
  moment: Date;
  /** Begin van het rode vak. */
  start: Date;
  /** Einde van het rode vak. */
  end: Date;
}

export function windowAround(moment: Date, mode: WindowMode): FertileMoment {
  const w = WINDOW_HOURS[mode];
  return {
    moment,
    start: new Date(moment.getTime() - w.before * HOUR_MS),
    end: new Date(moment.getTime() + w.after * HOUR_MS),
  };
}

/**
 * Alle momenten in [from, to] waarop de maanfase gelijk is aan de geboortefase,
 * elk met het bijbehorende vruchtbare venster.
 */
export function findFertileMoments(targetDeg: number, from: Date, to: Date, mode: WindowMode = 'before24'): FertileMoment[] {
  const out: FertileMoment[] = [];
  // begin iets eerder, zodat een venster dat voor `from` begint maar erin doorloopt niet gemist wordt
  let cursor = new Date(from.getTime() - 2 * DAY_MS);
  for (let guard = 0; guard < 400; guard++) {
    const t = Astronomy.SearchMoonPhase(targetDeg, cursor, 32);
    if (!t) break;
    const moment = t.date;
    if (moment.getTime() > to.getTime() + DAY_MS) break;
    if (moment.getTime() >= from.getTime() - DAY_MS) {
      out.push(windowAround(moment, mode));
    }
    cursor = new Date(moment.getTime() + 20 * DAY_MS);
  }
  return out;
}

export interface MoonQuarterEvent {
  kind: 'new' | 'first' | 'full' | 'last';
  time: Date;
}

const KINDS: MoonQuarterEvent['kind'][] = ['new', 'first', 'full', 'last'];

export function findMoonQuarters(from: Date, to: Date): MoonQuarterEvent[] {
  const out: MoonQuarterEvent[] = [];
  let q: Astronomy.MoonQuarter = Astronomy.SearchMoonQuarter(new Date(from.getTime() - DAY_MS));
  for (let guard = 0; guard < 2000; guard++) {
    const t = q.time.date;
    if (t.getTime() > to.getTime() + DAY_MS) break;
    if (t.getTime() >= from.getTime() - DAY_MS) out.push({ kind: KINDS[q.quarter], time: t });
    q = Astronomy.NextMoonQuarter(q);
  }
  return out;
}

export interface MoonTimeline {
  tz: string;
  targetDeg: number;
  fertile: FertileMoment[];
  quarters: MoonQuarterEvent[];
  /** dag -> 'peak' (dag met het exacte moment) of 'window' (24 uur ervoor) */
  fertileDays: Map<DayKey, 'peak' | 'window'>;
  newMoonDays: Map<DayKey, Date>;
  fullMoonDays: Map<DayKey, Date>;
}

/**
 * Markeert de kalenderdagen (in `tz`) die het rode venster werkelijk raken.
 * 'peak' = de dag waarop het exacte moment valt; 'window' = een andere dag van het venster.
 */
export function markFertileDays(fertile: FertileMoment[], tz: string): Map<DayKey, 'peak' | 'window'> {
  const map = new Map<DayKey, 'peak' | 'window'>();
  for (const f of fertile) {
    const peak = dayKeyInTz(f.moment, tz);
    let k: DayKey = dayKeyInTz(f.start, tz);
    const last = dayKeyInTz(f.end, tz);
    for (let i = 0; i < 5; i++) {
      const s = dayStartUtc(k, tz).getTime();
      const e = dayEndUtc(k, tz).getTime();
      // een dag telt alleen mee als het venster hem echt overlapt (niet slechts exact 00:00 raakt)
      const overlaps = f.end.getTime() > s && f.start.getTime() < e;
      if (overlaps && map.get(k) !== 'peak') map.set(k, k === peak ? 'peak' : 'window');
      if (k >= last) break;
      k = addDays(k, 1);
    }
  }
  return map;
}

export function buildMoonTimeline(targetDeg: number, from: Date, to: Date, tz: string, mode: WindowMode = 'before24'): MoonTimeline {
  const fertile = findFertileMoments(targetDeg, from, to, mode);
  const quarters = findMoonQuarters(from, to);
  const newMoonDays = new Map<DayKey, Date>();
  const fullMoonDays = new Map<DayKey, Date>();
  for (const q of quarters) {
    if (q.kind === 'new') newMoonDays.set(dayKeyInTz(q.time, tz), q.time);
    if (q.kind === 'full') fullMoonDays.set(dayKeyInTz(q.time, tz), q.time);
  }
  return { tz, targetDeg, fertile, quarters, fertileDays: markFertileDays(fertile, tz), newMoonDays, fullMoonDays };
}
