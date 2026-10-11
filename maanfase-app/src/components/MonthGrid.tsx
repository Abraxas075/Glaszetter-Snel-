import { type DayKey, WEEKDAYS_SHORT, daysInMonth, formatDayLong, makeKey, mondayIndex } from '../lib/dates';
import { useApp } from '../context';
import { MoonDot } from './ui';

export function describeDay(args: { key: DayKey; marks?: ReturnType<ReturnType<typeof useApp>['analysis']['marks']['get']>; fertile?: 'peak' | 'window'; newMoon: boolean; fullMoon: boolean; hasLog: boolean }): string {
  const { key, marks, fertile, newMoon, fullMoon, hasLog } = args;
  const parts = [formatDayLong(key)];
  if (marks?.period === 'actual') parts.push('menstruatie');
  if (marks?.period === 'predicted') parts.push('menstruatie verwacht');
  if (marks?.ovulation === 'actual') parts.push('ovulatie');
  if (marks?.ovulation === 'estimated') parts.push('ovulatie geschat');
  if (marks?.ovulation === 'predicted') parts.push('ovulatie verwacht');
  if (marks?.fertile) parts.push('vruchtbaar venster');
  if (fertile) parts.push('maanfase-vruchtbaar');
  if (newMoon) parts.push('nieuwe maan');
  if (fullMoon) parts.push('volle maan');
  if (hasLog) parts.push('dagboek ingevuld');
  return parts.join(', ');
}

export function MonthGrid({ y, m }: { y: number; m: number }) {
  const { today, analysis, moon, logs, openDay } = useApp();
  const nd = daysInMonth(y, m);
  const lead = mondayIndex(makeKey(y, m, 1));
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: nd }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const key = makeKey(y, m, d);
          const mk = analysis.marks.get(key);
          const fert = moon.fertileDays.get(key);
          const nm = moon.newMoonDays.has(key);
          const fm = moon.fullMoonDays.has(key);
          const hasLog = !!logs[key];
          const bg =
            mk?.period === 'actual'
              ? 'bg-period text-white border-period'
              : mk?.period === 'predicted'
                ? 'hatch-blue border-dashed border-period/70'
                : mk?.fertile === 'actual'
                  ? 'bg-ovul-soft border-ovul/30'
                  : mk?.fertile === 'predicted'
                    ? 'hatch-green border-ovul/30'
                    : 'bg-card border-line';
          return (
            <button
              key={key}
              type="button"
              onClick={() => openDay(key)}
              aria-label={describeDay({ key, marks: mk, fertile: fert, newMoon: nm, fullMoon: fm, hasLog })}
              className={`relative aspect-[5/6] rounded-2xl border text-sm font-semibold transition active:scale-95 ${bg} ${key === today ? 'ring-2 ring-accent ring-offset-1 ring-offset-app' : ''}`}
            >
              <span className="absolute inset-x-0 top-1.5 text-center leading-none">{d}</span>
              {mk?.ovulation && (
                <span
                  className={`absolute bottom-3 left-1.5 size-2.5 rounded-full ${
                    mk.ovulation === 'actual' ? 'bg-ovul ring-2 ring-white/70' : mk.ovulation === 'estimated' ? 'bg-ovul/60' : 'border-2 border-ovul bg-card/70'
                  }`}
                />
              )}
              {(nm || fm) && (
                <span className="absolute bottom-3 right-1.5">
                  <MoonDot kind={nm ? 'new' : 'full'} className="size-2.5" />
                </span>
              )}
              {hasLog && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent/80" />}
              {fert && <span className={`absolute inset-x-1.5 bottom-1 h-1.5 rounded-full ${fert === 'peak' ? 'bg-moon' : 'bg-moon/55'}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
