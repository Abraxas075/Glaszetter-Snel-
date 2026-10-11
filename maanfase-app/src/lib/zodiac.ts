import * as Astronomy from 'astronomy-engine';
import { type DayKey } from './dates';
import { dayKeyInTz } from './tz';

export interface Sign {
  name: string;
  glyph: string;
}

/** Tropische dierenriem (zoals Astrodienst standaard), Nederlandse namen. */
export const SIGNS: Sign[] = [
  { name: 'Ram', glyph: '♈' },
  { name: 'Stier', glyph: '♉' },
  { name: 'Tweelingen', glyph: '♊' },
  { name: 'Kreeft', glyph: '♋' },
  { name: 'Leeuw', glyph: '♌' },
  { name: 'Maagd', glyph: '♍' },
  { name: 'Weegschaal', glyph: '♎' },
  { name: 'Schorpioen', glyph: '♏' },
  { name: 'Boogschutter', glyph: '♐' },
  { name: 'Steenbok', glyph: '♑' },
  { name: 'Waterman', glyph: '♒' },
  { name: 'Vissen', glyph: '♓' },
];

export function sunSignIndex(date: Date): number {
  return Math.floor(Astronomy.SunPosition(date).elon / 30) % 12;
}

export interface SignIngress {
  signIndex: number;
  time: Date;
}

/** Momenten waarop de zon een nieuw teken binnengaat in [from, to]. */
export function sunIngresses(from: Date, to: Date): SignIngress[] {
  const out: SignIngress[] = [];
  let cursor = from;
  let idx = sunSignIndex(cursor);
  for (let guard = 0; guard < 60; guard++) {
    const next = (idx + 1) % 12;
    const t = Astronomy.SearchSunLongitude(next * 30, cursor, 40);
    if (!t || t.date.getTime() > to.getTime()) break;
    out.push({ signIndex: next, time: t.date });
    cursor = new Date(t.date.getTime() + 3600_000);
    idx = next;
  }
  return out;
}

/** Zonneteken(s) in een kalendermaand: teken bij het begin + eventuele wissel (met dag). */
export function signsForMonth(y: number, m: number, tz: string): { start: number; change?: { signIndex: number; day: DayKey; time: Date } } {
  const first = new Date(Date.UTC(y, m - 1, 1) - 12 * 3600_000);
  const last = new Date(Date.UTC(y, m, 1) + 12 * 3600_000);
  const startIdx = sunSignIndex(new Date(Date.UTC(y, m - 1, 1, 0, 0)));
  const inMonth = sunIngresses(first, last).find((i) => {
    const key = dayKeyInTz(i.time, tz);
    return key.startsWith(`${y}-${String(m).padStart(2, '0')}`);
  });
  if (!inMonth) return { start: startIdx };
  const day = dayKeyInTz(inMonth.time, tz);
  const idxBefore = (inMonth.signIndex + 11) % 12;
  return { start: idxBefore, change: { signIndex: inMonth.signIndex, day, time: inMonth.time } };
}
