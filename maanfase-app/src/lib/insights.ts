import { type DayKey, diffDays } from './dates';
import type { CycleInfo, Ovulation } from './cycle';
import type { MoonTimeline } from './moon';
import { dayKeyInTz } from './tz';
import type { Logs } from './types';

const SYNODIC_MONTH = 29.530588;

export interface MoonComparisonRow {
  cycleStart: DayKey;
  ovulation: Ovulation;
  /** valt de ovulatiedag binnen het rode maanfase-venster? */
  onMoonDay: boolean;
  /** dichtstbijzijnde dag met het exacte maanfase-moment */
  nearestMoonDay?: DayKey;
  /** ovulatiedag minus dichtstbijzijnde maanfase-dag (negatief = ovulatie vóór de maanfase-dag) */
  offsetDays?: number;
}

export interface MoonComparison {
  rows: MoonComparisonRow[];
  n: number;
  onDay: number;
  withinOne: number;
  /** verwachte kans op een treffer puur door toeval */
  chanceOnDay: number;
  chanceWithinOne: number;
  meanOffset?: number;
}

/** Hoe vaak valt mijn ovulatie samen met mijn maanfase-dag? */
export function compareOvulationWithMoon(cycles: CycleInfo[], moon: MoonTimeline): MoonComparison {
  const peaks = moon.fertile.map((f) => dayKeyInTz(f.moment, moon.tz));
  const rows: MoonComparisonRow[] = [];
  for (const c of cycles) {
    if (!c.ovulation) continue;
    let nearest: DayKey | undefined;
    let best = Infinity;
    for (const p of peaks) {
      const d = Math.abs(diffDays(p, c.ovulation.day));
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    rows.push({
      cycleStart: c.start,
      ovulation: c.ovulation,
      onMoonDay: moon.fertileDays.has(c.ovulation.day),
      nearestMoonDay: nearest,
      offsetDays: nearest ? diffDays(nearest, c.ovulation.day) : undefined,
    });
  }
  const offsets = rows.map((r) => r.offsetDays).filter((x): x is number => x !== undefined);
  const markedPerMonth = moon.fertile.length ? moon.fertileDays.size / moon.fertile.length : 2;
  return {
    rows,
    n: rows.length,
    onDay: rows.filter((r) => r.onMoonDay).length,
    withinOne: rows.filter((r) => r.offsetDays !== undefined && Math.abs(r.offsetDays) <= 1).length,
    chanceOnDay: markedPerMonth / SYNODIC_MONTH,
    chanceWithinOne: 3 / SYNODIC_MONTH,
    meanOffset: offsets.length ? offsets.reduce((s, v) => s + v, 0) / offsets.length : undefined,
  };
}

export interface BbtPoint {
  day: DayKey;
  t: number;
}

export function bbtSeries(logs: Logs, from: DayKey, to: DayKey): BbtPoint[] {
  return Object.keys(logs)
    .filter((d) => d >= from && d <= to && typeof logs[d].bbt === 'number')
    .sort()
    .map((d) => ({ day: d, t: logs[d].bbt as number }));
}
