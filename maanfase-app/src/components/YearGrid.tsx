import { WEEKDAYS_SHORT, daysInMonth, makeKey, monthName, mondayIndex } from '../lib/dates';
import { useApp } from '../context';
import { SIGNS, signsForMonth } from '../lib/zodiac';

function MiniMonth({ y, m, onPick }: { y: number; m: number; onPick: (m: number) => void }) {
  const { today, analysis, moon, tz } = useApp();
  const nd = daysInMonth(y, m);
  const lead = mondayIndex(makeKey(y, m, 1));
  const s = signsForMonth(y, m, tz);
  return (
    <button type="button" onClick={() => onPick(m)} aria-label={`${monthName(m)} ${y} openen`} className="rounded-2xl border border-line bg-card p-2.5 text-left shadow-sm active:brightness-95">
      <div className="mb-1 flex items-baseline justify-between gap-1">
        <span className="text-sm font-bold">{monthName(m)}</span>
        <span className="truncate text-[10px] text-muted">
          {SIGNS[s.start].glyph}
          {s.change ? `→${SIGNS[s.change.signIndex].glyph}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-px" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="text-center text-[8px] text-muted">
            {w[0]}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: nd }, (_, i) => {
          const key = makeKey(y, m, i + 1);
          const mk = analysis.marks.get(key);
          const fert = moon.fertileDays.get(key);
          const bg =
            mk?.period === 'actual'
              ? 'bg-period text-white'
              : mk?.period === 'predicted'
                ? 'bg-period-soft'
                : mk?.fertile
                  ? mk.fertile === 'actual'
                    ? 'bg-ovul-soft'
                    : 'bg-fertile'
                  : 'bg-soft/70';
          return (
            <div key={key} className={`relative grid aspect-square place-items-center rounded-[3px] text-[8px] leading-none ${bg} ${key === today ? 'ring-1 ring-accent' : ''}`}>
              {i + 1}
              {mk?.ovulation && <span className="absolute left-0 top-0 size-1.5 rounded-full bg-ovul" />}
              {moon.newMoonDays.has(key) && <span className="absolute right-0 top-0 size-1.5 rounded-full bg-newmoon" />}
              {moon.fullMoonDays.has(key) && <span className="absolute right-0 top-0 size-1.5 rounded-full bg-fullmoon" />}
              {fert && <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full ${fert === 'peak' ? 'bg-moon' : 'bg-moon/55'}`} />}
            </div>
          );
        })}
      </div>
    </button>
  );
}

export function YearGrid({ y, onPick }: { y: number; onPick: (m: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth key={i} y={y} m={i + 1} onPick={onPick} />
      ))}
    </div>
  );
}
