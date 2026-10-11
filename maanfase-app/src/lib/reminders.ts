import { type DayKey, addDays, formatDayShort, parseKey } from './dates';
import type { CycleAnalysis } from './cycle';
import type { MoonTimeline } from './moon';
import { dayKeyInTz, formatTimeInTz, zonedToUtc } from './tz';
import type { NotificationSettings } from './types';

export interface Reminder {
  /** Stabiele id, zodat een melding maar één keer getoond wordt. */
  id: string;
  /** Tijdstip (epoch ms) waarop de melding hoort. */
  at: number;
  title: string;
  body: string;
}

function atTime(day: DayKey, hhmm: string, tz: string): number {
  const { y, m, d } = parseKey(day);
  const [h, mi] = hhmm.split(':').map(Number);
  return zonedToUtc(y, m, d, h || 0, mi || 0, tz).getTime();
}

/** Alle geplande meldingen vanaf `now` voor de komende `horizonDays` dagen. */
export function buildReminders(args: {
  analysis: CycleAnalysis;
  moon: MoonTimeline | null;
  settings: NotificationSettings;
  tz: string;
  now: Date;
  horizonDays?: number;
}): Reminder[] {
  const { analysis, moon, settings, tz, now } = args;
  if (!settings.enabled) return [];
  const horizon = now.getTime() + (args.horizonDays ?? 120) * 86_400_000;
  const earliest = now.getTime() - 18 * 3_600_000; // gemiste meldingen van de laatste 18 uur nog tonen
  const out: Reminder[] = [];
  const push = (r: Reminder) => {
    if (r.at >= earliest && r.at <= horizon) out.push(r);
  };

  if (settings.menstruation) {
    const starts = analysis.predicted.map((p, i) => (i === 0 ? p.nextStart : p.periodStart));
    for (const s of new Set(starts)) {
      const day = addDays(s, -2);
      push({
        id: `menstruatie:${s}`,
        at: atTime(day, settings.time, tz),
        title: 'Menstruatie verwacht',
        body: `Over 2 dagen wordt je menstruatie verwacht (${formatDayShort(s)}).`,
      });
    }
  }

  if (settings.bioFertile) {
    for (const p of analysis.predicted) {
      push({
        id: `vruchtbaar:${p.fertileStart}`,
        at: atTime(p.fertileStart, settings.time, tz),
        title: 'Vruchtbaar venster begint',
        body: `Je biologische vruchtbare periode loopt van ${formatDayShort(p.fertileStart)} t/m ${formatDayShort(p.fertileEnd)}. Verwachte ovulatie: ${formatDayShort(p.ovulation)}.`,
      });
    }
  }

  if (settings.moonFertile && moon) {
    for (const f of moon.fertile) {
      const day = dayKeyInTz(f.start, tz);
      push({
        id: `maanfase:${day}`,
        at: atTime(day, settings.time, tz),
        title: 'Maanfase-vruchtbare dag',
        body: `Je maanfase-venster loopt van ${formatDayShort(day)} ${formatTimeInTz(f.start, tz)} tot ${formatDayShort(dayKeyInTz(f.end, tz))} ${formatTimeInTz(f.end, tz)}.`,
      });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/** Meldingen die nu getoond moeten worden (tijd verstreken, nog niet getoond). */
export function dueReminders(all: Reminder[], shown: Set<string>, now: number): Reminder[] {
  return all.filter((r) => r.at <= now && r.at >= now - 18 * 3_600_000 && !shown.has(r.id));
}
