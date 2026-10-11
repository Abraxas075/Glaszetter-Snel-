import { useState } from 'react';
import { MonthGrid } from '../components/MonthGrid';
import { Legend } from '../components/Legend';
import { YearGrid } from '../components/YearGrid';
import { Button, Icon, Segmented } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';
import { useApp } from '../context';
import { addMonths, formatDayMonth, formatMonthYear, parseKey } from '../lib/dates';
import { SIGNS, signsForMonth } from '../lib/zodiac';

const MAX_MONTHS = 34; // de maanfase-tijdlijn loopt ~3 jaar vooruit en achteruit

export default function CalendarScreen() {
  const { today, tz, goTo } = useApp();
  const t = parseKey(today);
  const [view, setView] = useState<'maand' | 'jaar'>('maand');
  const [cur, setCur] = useState({ y: t.y, m: t.m });
  const offset = (cur.y - t.y) * 12 + (cur.m - t.m);
  const move = (n: number) => setCur((c) => (Math.abs(offset + n) <= MAX_MONTHS ? addMonths(c.y, c.m, n) : c));
  const moveYear = (n: number) => (Math.abs(offset + 12 * n) <= MAX_MONTHS ? setCur((c) => ({ y: c.y + n, m: c.m })) : undefined);
  const signs = signsForMonth(cur.y, cur.m, tz);

  return (
    <div className="pb-28">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Kalender</h1>
        <div className="w-44">
          <Segmented label="Weergave" value={view} onChange={setView} options={[{ value: 'maand', label: 'Maand' }, { value: 'jaar', label: 'Jaar' }]} />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button type="button" aria-label={view === 'maand' ? 'Vorige maand' : 'Vorig jaar'} onClick={() => (view === 'maand' ? move(-1) : moveYear(-1))} className="grid size-12 place-items-center rounded-2xl bg-card text-accent shadow-sm active:brightness-95">
          <Icon name="left" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-extrabold leading-tight">{view === 'maand' ? formatMonthYear(cur.y, cur.m) : cur.y}</div>
          {view === 'maand' && (
            <div className="text-xs text-muted" aria-label="Sterrenbeeld van de zon">
              ☉ {SIGNS[signs.start].glyph} {SIGNS[signs.start].name}
              {signs.change && (
                <>
                  {' '}
                  → {SIGNS[signs.change.signIndex].glyph} {SIGNS[signs.change.signIndex].name} ({formatDayMonth(signs.change.day)})
                </>
              )}
            </div>
          )}
        </div>
        <button type="button" aria-label={view === 'maand' ? 'Volgende maand' : 'Volgend jaar'} onClick={() => (view === 'maand' ? move(1) : moveYear(1))} className="grid size-12 place-items-center rounded-2xl bg-card text-accent shadow-sm active:brightness-95">
          <Icon name="right" />
        </button>
      </div>
      {(cur.y !== t.y || cur.m !== t.m) && (
        <div className="mb-3 flex justify-center">
          <Button variant="ghost" className="!min-h-10 !py-1.5 text-sm" onClick={() => setCur({ y: t.y, m: t.m })}>
            Naar vandaag
          </Button>
        </div>
      )}

      {view === 'maand' ? (
        <MonthGrid y={cur.y} m={cur.m} />
      ) : (
        <YearGrid
          y={cur.y}
          onPick={(m) => {
            setCur({ y: cur.y, m });
            setView('maand');
          }}
        />
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="soft" icon="print" className="!min-h-11 text-sm" onClick={() => goTo('meer', 'export')}>
          Jaaroverzicht als PDF
        </Button>
      </div>
      <Disclaimer className="mt-4" />

      {/* legenda: altijd zichtbaar boven de navigatiebalk */}
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-3">
        <div className="rounded-2xl border border-line bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <Legend />
        </div>
      </div>
    </div>
  );
}
