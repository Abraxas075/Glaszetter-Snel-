import { type DayKey, addDays, diffDays } from './dates';
import type { DayLog, Logs } from './types';

export type Patches = Record<DayKey, DayLog | null>;

const hasFlow = (logs: Logs, d: DayKey) => !!logs[d]?.flow;

function withFlow(log: DayLog | undefined, flow: DayLog['flow']): DayLog {
  const next: DayLog = { ...(log ?? {}) };
  if (flow) next.flow = flow;
  else delete next.flow;
  return next;
}

/**
 * Menstruatie gestart op `day`. Ligt de dag in het verleden, dan worden de dagen
 * tot en met vandaag (maximaal `periodLength` dagen) ook gemarkeerd.
 */
export function startPeriod(logs: Logs, day: DayKey, today: DayKey, periodLength: number): Patches {
  const patches: Patches = {};
  const last = Math.min(diffDays(day, today), Math.max(1, periodLength) - 1);
  for (let i = 0; i <= Math.max(0, last); i++) {
    const d = addDays(day, i);
    if (i === 0 || !hasFlow(logs, d)) patches[d] = withFlow(logs[d], logs[d]?.flow ?? 'normaal');
  }
  return patches;
}

/**
 * Menstruatie eindigt op `day`: alle dagen vanaf het begin van deze menstruatie tot en met `day`
 * worden gemarkeerd; latere dagen van dezelfde menstruatie worden weer vrijgemaakt.
 */
export function endPeriod(logs: Logs, day: DayKey): Patches {
  const patches: Patches = {};
  // begin van de menstruatie: ga terug zolang de vorige dag ook een menstruatiedag is
  let start = day;
  if (!hasFlow(logs, day)) {
    // zoek de dichtstbijzijnde menstruatiedag vóór `day` (max 14 dagen terug)
    let found: DayKey | undefined;
    for (let i = 1; i <= 14; i++) {
      if (hasFlow(logs, addDays(day, -i))) {
        found = addDays(day, -i);
        break;
      }
    }
    if (!found) return patches;
    start = found;
  }
  while (hasFlow(logs, addDays(start, -1))) start = addDays(start, -1);
  for (let d = start; d <= day; d = addDays(d, 1)) {
    if (!hasFlow(logs, d)) patches[d] = withFlow(logs[d], 'normaal');
  }
  for (let d = addDays(day, 1); hasFlow(logs, d); d = addDays(d, 1)) patches[d] = withFlow(logs[d], undefined);
  return patches;
}

export function clearPeriodDay(logs: Logs, day: DayKey): Patches {
  return { [day]: withFlow(logs[day], undefined) };
}
