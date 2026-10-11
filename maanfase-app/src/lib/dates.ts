/** Kalenderdag als 'YYYY-MM-DD' (burgerlijke datum, zonder tijdzone). */
export type DayKey = string;

const DAY_MS = 86_400_000;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function makeKey(y: number, m: number, d: number): DayKey {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

export function parseKey(key: DayKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function isValidKey(key: unknown): key is DayKey {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { y, m, d } = parseKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Dagnummer sinds 1970-01-01 (voor optellen/aftrekken). */
export function dayNum(key: DayKey): number {
  const { y, m, d } = parseKey(key);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNum(n: number): DayKey {
  const dt = new Date(n * DAY_MS);
  return makeKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(key: DayKey, n: number): DayKey {
  return fromDayNum(dayNum(key) + n);
}

/** b - a in dagen. */
export function diffDays(a: DayKey, b: DayKey): number {
  return dayNum(b) - dayNum(a);
}

/** 0 = maandag ... 6 = zondag (Nederlandse weekindeling). */
export function mondayIndex(key: DayKey): number {
  const wd = new Date(dayNum(key) * DAY_MS).getUTCDay(); // 0 = zondag
  return (wd + 6) % 7;
}

export function isSunday(key: DayKey): boolean {
  return mondayIndex(key) === 6;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthStartKey(y: number, m: number): DayKey {
  return makeKey(y, m, 1);
}

export function addMonths(y: number, m: number, n: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + n;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

export function compareKeys(a: DayKey, b: DayKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function rangeKeys(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let n = dayNum(from); n <= dayNum(to); n++) out.push(fromDayNum(n));
  return out;
}

const nlDate = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const nlDateShort = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const nlDayMonth = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const nlDayMonthYear = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const nlMonthYear = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const nlMonth = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', month: 'long' });
const nlWeekdayLong = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'long' });

const asDate = (key: DayKey) => new Date(dayNum(key) * DAY_MS);

export const formatDayLong = (key: DayKey) => nlDate.format(asDate(key));
export const formatDayShort = (key: DayKey) => nlDateShort.format(asDate(key));
export const formatDayMonth = (key: DayKey) => nlDayMonth.format(asDate(key));
export const formatDayMonthYear = (key: DayKey) => nlDayMonthYear.format(asDate(key));
export const formatMonthYear = (y: number, m: number) => capitalize(nlMonthYear.format(new Date(Date.UTC(y, m - 1, 1))));
export const monthName = (m: number) => capitalize(nlMonth.format(new Date(Date.UTC(2001, m - 1, 1))));
export const weekdayLong = (key: DayKey) => nlWeekdayLong.format(asDate(key));

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const WEEKDAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
