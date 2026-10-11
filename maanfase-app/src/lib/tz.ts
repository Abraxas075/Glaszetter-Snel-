import { type DayKey, makeKey, parseKey, addDays } from './dates';

export const DEFAULT_TZ = 'Europe/Amsterdam';

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export interface ZonedParts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

export function partsInTz(date: Date, tz: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of dtf(tz).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { y: out.year, m: out.month, d: out.day, h: out.hour, mi: out.minute, s: out.second };
}

/** Verschil lokale tijd - UTC (ms) op een gegeven moment. */
export function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Lokale wandtijd in een tijdzone -> UTC-moment (houdt rekening met zomertijd en historische regels). */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string, s = 0): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc), tz);
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
}

export function dayKeyInTz(date: Date, tz: string): DayKey {
  const p = partsInTz(date, tz);
  return makeKey(p.y, p.m, p.d);
}

/** UTC-moment waarop een kalenderdag in de tijdzone begint (00:00 lokale tijd). */
export function dayStartUtc(key: DayKey, tz: string): Date {
  const { y, m, d } = parseKey(key);
  return zonedToUtc(y, m, d, 0, 0, tz);
}

export function dayEndUtc(key: DayKey, tz: string): Date {
  return dayStartUtc(addDays(key, 1), tz);
}

/** Fractie (0..1+) van een moment binnen een kalenderdag. */
export function dayFraction(date: Date, key: DayKey, tz: string): number {
  const a = dayStartUtc(key, tz).getTime();
  const b = dayEndUtc(key, tz).getTime();
  return (date.getTime() - a) / (b - a);
}

export function formatTimeInTz(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
}

/** 'UTC+1' / 'UTC+5:30' op een gegeven moment. */
export function offsetLabel(date: Date, tz: string): string {
  const mins = Math.round(tzOffsetMs(date, tz) / 60000);
  const sign = mins < 0 ? '-' : '+';
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const COMMON_TIMEZONES = [
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Lisbon',
  'Atlantic/Canary',
  'America/Paramaribo',
  'America/Curacao',
  'America/New_York',
  'America/Los_Angeles',
  'Africa/Casablanca',
  'Europe/Istanbul',
  'Asia/Jakarta',
  'UTC',
];

export function allTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const list = fn ? fn('timeZone') : [];
    if (list.length) return Array.from(new Set([...COMMON_TIMEZONES, ...list])).sort();
  } catch {
    /* val terug op de korte lijst */
  }
  return COMMON_TIMEZONES;
}
