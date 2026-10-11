import { useMemo, useState } from 'react';
import { BbtChart } from '../components/BbtChart';
import { Disclaimer } from '../components/Disclaimer';
import { Card, H2, Segmented } from '../components/ui';
import { useApp } from '../context';
import { type DayKey, addDays, formatDayMonth, formatDayShort } from '../lib/dates';
import { bbtSeries, compareOvulationWithMoon } from '../lib/insights';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const nl1 = (n: number) => n.toFixed(1).replace('.', ',');

export default function Insights() {
  const { analysis, logs, today, moon } = useApp();
  const st = analysis.stats;
  const [range, setRange] = useState<30 | 60 | 90>(60);
  const from = addDays(today, -(range - 1));
  const points = useMemo(() => bbtSeries(logs, from, today), [logs, from, today]);
  const periodDays = useMemo(() => new Set<DayKey>(Object.keys(logs).filter((d) => logs[d].flow)), [logs]);
  const ovDays = analysis.cycles.filter((c) => c.ovulation).map((c) => c.ovulation!.day);
  const cmp = useMemo(() => compareOvulationWithMoon(analysis.cycles, moon), [analysis.cycles, moon]);
  const recent = analysis.cycles.slice(-8).reverse();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Overzicht</h1>

      <section aria-label="Statistieken" className="grid grid-cols-2 gap-3">
        <Stat label="Gem. cycluslengte" value={st.nCycles ? `${nl1(st.avgCycle)} d` : '—'} sub={st.minCycle ? `${st.minCycle}–${st.maxCycle} dagen` : 'nog geen volledige cyclus'} />
        <Stat label="Regelmaat" value={st.regularity === 'onvoldoende gegevens' ? '—' : st.regularity} sub={st.sdCycle !== undefined ? `± ${nl1(st.sdCycle)} dag` : 'min. 3 menstruaties nodig'} small />
        <Stat label="Gem. menstruatie" value={`${nl1(st.avgPeriod)} d`} sub={st.usingDefaults ? 'ingestelde standaard' : 'uit eigen gegevens'} />
        <Stat label="Lutale fase" value={`${Math.round(st.avgLuteal)} d`} sub={`${st.nOvulations} ovulatie(s) bekend`} />
      </section>

      <Card>
        <H2 icon="thermo">Basale temperatuur</H2>
        <div className="mb-3 w-full">
          <Segmented label="Periode" value={range} onChange={setRange} options={[{ value: 30, label: '30 dagen' }, { value: 60, label: '60 dagen' }, { value: 90, label: '90 dagen' }]} />
        </div>
        {points.length >= 2 ? (
          <BbtChart points={points} from={from} to={today} periodDays={periodDays} ovulationDays={ovDays} />
        ) : (
          <p className="rounded-2xl bg-soft p-4 text-center text-sm text-muted">Meet elke ochtend vóór het opstaan je temperatuur en vul die in het dagboek in. Na een paar dagen zie je hier je grafiek.</p>
        )}
        <p className="mt-2 text-xs text-muted">Blauwe vlakken = menstruatie, groene lijn = ovulatie (zelf gemarkeerd of geschat).</p>
      </Card>

      <Card>
        <H2 icon="moon">Ovulatie vs. maanfase</H2>
        {cmp.n === 0 ? (
          <p className="text-sm text-muted">Zodra je ovulatie hebt gemarkeerd (of een positieve ovulatietest of temperatuurverschuiving hebt ingevoerd), vergelijkt de app hier of die samenvalt met je maanfase-dag.</p>
        ) : (
          <>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-4xl font-extrabold leading-none text-accent">
                  {cmp.onDay}
                  <span className="text-xl text-muted"> / {cmp.n}</span>
                </div>
                <div className="mt-1 text-sm text-muted">ovulaties op een maanfase-dag</div>
              </div>
              <div className="ml-auto text-right text-sm">
                <div>
                  <b>{cmp.withinOne}</b> / {cmp.n} binnen 1 dag
                </div>
                {cmp.meanOffset !== undefined && <div className="text-muted">gem. verschil {cmp.meanOffset > 0 ? '+' : ''}{nl1(cmp.meanOffset)} d</div>}
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-soft p-3 text-xs leading-snug text-muted">
              Puur toevallig zou je ongeveer {pct(cmp.chanceOnDay)} treffers op een maanfase-dag verwachten ({pct(cmp.chanceWithinOne)} binnen 1 dag). {cmp.n < 6 ? 'Met zo weinig cycli zegt dit nog weinig; ' : ''}De maanfase-methode is niet wetenschappelijk bewezen.
            </p>
            <ul className="mt-3 divide-y divide-line text-sm">
              {cmp.rows.slice(-8).reverse().map((r) => (
                <li key={r.cycleStart} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {formatDayShort(r.ovulation.day)} <span className="text-xs text-muted">({r.ovulation.source})</span>
                  </span>
                  <span className={r.onMoonDay ? 'font-bold text-moon' : 'text-muted'}>
                    {r.onMoonDay ? 'op maanfase-dag' : r.offsetDays !== undefined ? `${r.offsetDays > 0 ? '+' : ''}${r.offsetDays} d t.o.v. maanfase` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <H2 icon="list">Laatste cycli</H2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Nog geen cycli ingevoerd.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Start</th>
                <th className="pb-2 font-semibold">Lengte</th>
                <th className="pb-2 font-semibold">Menstr.</th>
                <th className="pb-2 font-semibold">Ovulatie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((c) => (
                <tr key={c.start}>
                  <td className="py-2">{formatDayMonth(c.start)}</td>
                  <td className="py-2">{c.length ? `${c.length} d` : <span className="text-muted">lopend</span>}</td>
                  <td className="py-2">{c.period.length} d</td>
                  <td className="py-2">{c.ovulation ? formatDayShort(c.ovulation.day) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Disclaimer />
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className={`mt-1 font-extrabold first-letter:uppercase leading-tight ${small ? 'text-lg' : 'text-2xl'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
