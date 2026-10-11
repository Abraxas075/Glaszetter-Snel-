import { type DayKey, addDays, diffDays, fromDayNum, dayNum, compareKeys } from './dates';
import type { DayLog, Logs, Profile } from './types';

/* ---------- vaste aannames ---------- */
export const FERTILE_BEFORE = 5; // vruchtbaar venster: 5 dagen vóór de ovulatie
export const FERTILE_AFTER = 1; //  ... tot 1 dag erna
export const DEFAULT_LUTEAL = 14;
const VALID_CYCLE: [number, number] = [15, 60];
const VALID_LUTEAL: [number, number] = [8, 18];
const RECENT = 6;

export type OvSource = 'zelf' | 'lh' | 'temperatuur';

export interface Period {
  start: DayKey;
  end: DayKey;
  length: number;
}

export interface Ovulation {
  day: DayKey;
  source: OvSource;
}

export interface CycleInfo {
  start: DayKey;
  /** Eerste dag van de volgende (werkelijke) menstruatie, indien bekend. */
  nextStart?: DayKey;
  /** Cycluslengte in dagen (alleen als de volgende menstruatie bekend is). */
  length?: number;
  period: Period;
  ovulation?: Ovulation;
  /** Lutale fase = dagen tussen ovulatie en volgende menstruatie. */
  luteal?: number;
}

export interface PredictedCycle {
  periodStart: DayKey;
  periodEnd: DayKey;
  nextStart: DayKey;
  ovulation: DayKey;
  fertileStart: DayKey;
  fertileEnd: DayKey;
  /** true als de ovulatie van deze cyclus uit eigen gegevens komt (lh/temperatuur/zelf). */
  ovulationKnown: boolean;
  /** true als de menstruatie al werkelijk is begonnen (huidige cyclus). */
  current: boolean;
}

export type Regularity = 'regelmatig' | 'redelijk regelmatig' | 'onregelmatig' | 'onvoldoende gegevens';

export interface CycleStats {
  nCycles: number;
  nOvulations: number;
  avgCycle: number;
  minCycle?: number;
  maxCycle?: number;
  sdCycle?: number;
  regularity: Regularity;
  avgPeriod: number;
  avgLuteal: number;
  /** true als de voorspelling puur op de ingestelde standaard berust. */
  usingDefaults: boolean;
}

export type DayState = 'actual' | 'predicted';

export interface DayMarks {
  period?: DayState;
  ovulation?: DayState | 'estimated';
  fertile?: DayState;
}

export interface CycleAnalysis {
  periods: Period[];
  cycles: CycleInfo[];
  stats: CycleStats;
  predicted: PredictedCycle[];
  lastStart?: DayKey;
  cycleDay?: number;
  nextPeriod?: DayKey;
  /** > 0 als de verwachte menstruatie al voorbij is zonder dat er een nieuwe is ingevoerd. */
  overdueDays: number;
  marks: Map<DayKey, DayMarks>;
}

/* ---------- hulpfuncties ---------- */
const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
}

/** Gemiddelde met een 'prior' (standaardwaarde) die vervalt zodra er genoeg eigen gegevens zijn. */
function shrunkMean(observed: number[], prior: number, priorWeight = 2): number {
  const recent = observed.slice(-RECENT);
  if (!recent.length) return prior;
  const w0 = Math.max(0, priorWeight - recent.length);
  return (recent.reduce((s, v) => s + v, 0) + prior * w0) / (recent.length + w0);
}

export const isPeriodDay = (log?: DayLog) => !!log?.flow;

/* ---------- menstruaties en cycli ---------- */
export function periodRuns(logs: Logs): Period[] {
  const days = Object.keys(logs)
    .filter((k) => isPeriodDay(logs[k]))
    .sort(compareKeys);
  const runs: Period[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && diffDays(last.end, d) === 1) {
      last.end = d;
      last.length++;
    } else runs.push({ start: d, end: d, length: 1 });
  }
  return runs;
}

/** Eerste dag met een positieve ovulatietest + 1 dag (LH-piek gaat 24-36 uur vóór de ovulatie). */
function ovFromLh(days: DayKey[], logs: Logs): DayKey | undefined {
  const first = days.find((d) => logs[d]?.lh === 'positief');
  return first ? addDays(first, 1) : undefined;
}

/**
 * Temperatuurverschuiving volgens de '3 boven 6'-regel: drie opeenvolgende temperaturen
 * boven de hoogste van de 6 voorgaande, de derde minstens 0,2 °C erboven.
 * De ovulatie wordt geschat op de dag vóór de eerste verhoogde temperatuur.
 */
export function ovFromTemperature(temps: { day: DayKey; t: number }[]): DayKey | undefined {
  for (let i = 6; i + 2 < temps.length; i++) {
    const base = Math.max(...temps.slice(i - 6, i).map((x) => x.t));
    const [a, b, c] = [temps[i], temps[i + 1], temps[i + 2]];
    if (a.t > base && b.t > base && c.t >= base + 0.2 && diffDays(a.day, c.day) <= 5) {
      return addDays(a.day, -1);
    }
  }
  return undefined;
}

export function detectOvulation(start: DayKey, endExclusive: DayKey | undefined, logs: Logs, today: DayKey): Ovulation | undefined {
  const last = endExclusive ? addDays(endExclusive, -1) : today;
  const days = Object.keys(logs)
    .filter((d) => d >= start && d <= last)
    .sort(compareKeys);
  const manual = days.find((d) => logs[d].ovulation);
  if (manual) return { day: manual, source: 'zelf' };
  const lh = ovFromLh(days, logs);
  if (lh) return { day: lh, source: 'lh' };
  const temps = days.filter((d) => typeof logs[d].bbt === 'number').map((d) => ({ day: d, t: logs[d].bbt as number }));
  const tv = ovFromTemperature(temps);
  if (tv && tv >= start && tv <= last) return { day: tv, source: 'temperatuur' };
  return undefined;
}

export function buildCycles(logs: Logs, today: DayKey): { periods: Period[]; cycles: CycleInfo[] } {
  const periods = periodRuns(logs);
  const cycles: CycleInfo[] = periods.map((p, i) => {
    const next = periods[i + 1];
    const info: CycleInfo = { start: p.start, period: p };
    if (next) {
      info.nextStart = next.start;
      info.length = diffDays(p.start, next.start);
    }
    info.ovulation = detectOvulation(p.start, next?.start, logs, today);
    if (info.ovulation && info.nextStart) {
      const l = diffDays(info.ovulation.day, info.nextStart);
      if (l >= VALID_LUTEAL[0] && l <= VALID_LUTEAL[1]) info.luteal = l;
    }
    return info;
  });
  return { periods, cycles };
}

/* ---------- statistieken en voorspellingen ---------- */
export function computeStats(cycles: CycleInfo[], periods: Period[], profile: Pick<Profile, 'cycleLength' | 'periodLength'>, today: DayKey): CycleStats {
  const lengths = cycles
    .map((c) => c.length)
    .filter((l): l is number => l !== undefined && l >= VALID_CYCLE[0] && l <= VALID_CYCLE[1]);
  // een nog lopende menstruatie (laatste run die vandaag of gisteren eindigt) telt niet mee voor de duur
  const completed = periods.filter((p, i) => !(i === periods.length - 1 && diffDays(p.end, today) <= 1));
  const periodLengths = completed.map((p) => p.length).filter((l) => l >= 1 && l <= 14);
  const lutealLengths = cycles.map((c) => c.luteal).filter((l): l is number => l !== undefined);
  const nOvulations = cycles.filter((c) => c.ovulation).length;

  const avgCycle = shrunkMean(lengths, profile.cycleLength);
  const spread = lengths.length >= 2 ? sd(lengths.slice(-RECENT)) : undefined;
  let regularity: Regularity = 'onvoldoende gegevens';
  if (spread !== undefined) regularity = spread <= 2 ? 'regelmatig' : spread <= 4 ? 'redelijk regelmatig' : 'onregelmatig';

  return {
    nCycles: lengths.length,
    nOvulations,
    avgCycle,
    minCycle: lengths.length ? Math.min(...lengths) : undefined,
    maxCycle: lengths.length ? Math.max(...lengths) : undefined,
    sdCycle: spread,
    regularity,
    avgPeriod: shrunkMean(periodLengths, profile.periodLength),
    avgLuteal: shrunkMean(lutealLengths, DEFAULT_LUTEAL, 2),
    usingDefaults: lengths.length === 0,
  };
}

export function fertileWindow(ovulation: DayKey): { start: DayKey; end: DayKey } {
  return { start: addDays(ovulation, -FERTILE_BEFORE), end: addDays(ovulation, FERTILE_AFTER) };
}

function predictCycles(cycles: CycleInfo[], stats: CycleStats, horizon: DayKey): PredictedCycle[] {
  const current = cycles[cycles.length - 1];
  if (!current) return [];
  const out: PredictedCycle[] = [];
  const luteal = Math.round(stats.avgLuteal);
  const periodLen = Math.max(1, Math.round(stats.avgPeriod));

  // huidige cyclus: met bekende ovulatie is de volgende menstruatie nauwkeuriger te voorspellen
  const knownOv = current.ovulation;
  const nextFromLength = addDays(current.start, Math.round(stats.avgCycle));
  const nextStart = knownOv ? addDays(knownOv.day, luteal) : nextFromLength;
  const ov = knownOv ? knownOv.day : addDays(nextStart, -luteal);
  const w = fertileWindow(ov);
  out.push({
    periodStart: current.start,
    periodEnd: current.period.end,
    nextStart,
    ovulation: ov,
    fertileStart: w.start,
    fertileEnd: w.end,
    ovulationKnown: !!knownOv,
    current: true,
  });

  // volgende cycli: vaste stap van de gemiddelde lengte, vanaf de verwachte volgende menstruatie
  let start = nextStart;
  for (let k = 1; k < 40 && start <= horizon; k++) {
    const next = addDays(nextStart, Math.round(k * stats.avgCycle));
    const o = addDays(next, -luteal);
    const win = fertileWindow(o);
    out.push({
      periodStart: start,
      periodEnd: addDays(start, periodLen - 1),
      nextStart: next,
      ovulation: o,
      fertileStart: win.start,
      fertileEnd: win.end,
      ovulationKnown: false,
      current: false,
    });
    start = next;
  }
  return out;
}

function setMark(marks: Map<DayKey, DayMarks>, day: DayKey, patch: Partial<DayMarks>) {
  const cur = marks.get(day) ?? {};
  // werkelijke gegevens gaan voor op voorspellingen
  for (const [k, v] of Object.entries(patch) as [keyof DayMarks, string][]) {
    const existing = cur[k] as string | undefined;
    if (!existing || (existing !== 'actual' && v === 'actual')) (cur as Record<string, string>)[k] = v;
  }
  marks.set(day, cur);
}

export function analyze(logs: Logs, profile: Pick<Profile, 'cycleLength' | 'periodLength'>, today: DayKey, horizonDays = 430): CycleAnalysis {
  const { periods, cycles } = buildCycles(logs, today);
  const stats = computeStats(cycles, periods, profile, today);
  const horizon = addDays(today, horizonDays);
  const predicted = predictCycles(cycles, stats, horizon);
  const marks = new Map<DayKey, DayMarks>();

  for (const [day, log] of Object.entries(logs)) {
    if (isPeriodDay(log)) setMark(marks, day, { period: 'actual' });
  }
  // eigen ovulaties en bijbehorende vruchtbare vensters (ook voor eerdere cycli)
  cycles.forEach((c, i) => {
    const isCurrent = i === cycles.length - 1;
    if (c.ovulation) {
      setMark(marks, c.ovulation.day, { ovulation: c.ovulation.source === 'zelf' ? 'actual' : 'estimated' });
      if (!isCurrent) {
        const w = fertileWindow(c.ovulation.day);
        for (let n = dayNum(w.start); n <= dayNum(w.end); n++) setMark(marks, fromDayNum(n), { fertile: 'actual' });
      }
    }
  });
  for (const p of predicted) {
    // voorspelde menstruatie (de huidige cyclus is al werkelijk)
    if (!p.current) {
      for (let n = dayNum(p.periodStart); n <= dayNum(p.periodEnd); n++) setMark(marks, fromDayNum(n), { period: 'predicted' });
    }
    if (!p.ovulationKnown) setMark(marks, p.ovulation, { ovulation: 'predicted' });
    const state: DayState = p.ovulationKnown ? 'actual' : 'predicted';
    for (let n = dayNum(p.fertileStart); n <= dayNum(p.fertileEnd); n++) setMark(marks, fromDayNum(n), { fertile: state });
  }

  const last = cycles[cycles.length - 1];
  const nextPeriod = predicted[0]?.nextStart;
  const overdueDays = nextPeriod && nextPeriod < today && last && last.start < nextPeriod ? diffDays(nextPeriod, today) : 0;
  return {
    periods,
    cycles,
    stats,
    predicted,
    lastStart: last?.start,
    cycleDay: last ? diffDays(last.start, today) + 1 : undefined,
    nextPeriod,
    overdueDays,
    marks,
  };
}

export interface NextEvents {
  /** Eerstvolgende (verwachte) eerste dag van de menstruatie; kan in het verleden liggen als die te laat is. */
  period?: DayKey;
  ovulation?: DayKey;
  ovulationKnown?: boolean;
  fertileStart?: DayKey;
  fertileEnd?: DayKey;
}

export function nextEvents(analysis: CycleAnalysis, today: DayKey): NextEvents {
  const ov = analysis.predicted.find((p) => p.ovulation >= today);
  const win = analysis.predicted.find((p) => p.fertileEnd >= today);
  return {
    period: analysis.nextPeriod,
    ovulation: ov?.ovulation,
    ovulationKnown: ov?.ovulationKnown,
    fertileStart: win?.fertileStart,
    fertileEnd: win?.fertileEnd,
  };
}
