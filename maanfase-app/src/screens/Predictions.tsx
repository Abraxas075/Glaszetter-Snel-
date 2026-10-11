import { diffDays, formatDayLong, formatDayMonth, formatDayShort } from '../lib/dates';
import { Card, H2 } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';
import { useApp } from '../context';
import { nextEvents } from '../lib/cycle';
import { formatPhase } from '../lib/moon';
import { dayKeyInTz, formatTimeInTz, offsetLabel } from '../lib/tz';

const inDays = (n: number) => (n === 0 ? 'vandaag' : n === 1 ? 'morgen' : n < 0 ? `${-n} d geleden` : `over ${n} d`);

export default function Predictions() {
  const { today, tz, moon, analysis, phase, birthUtc, settings, profile } = useApp();
  const next = nextEvents(analysis, today);
  const st = analysis.stats;
  const nowMs = Date.now();
  const horizon = nowMs + 366 * 86_400_000;
  const list = moon.fertile.filter((f) => f.end.getTime() >= nowMs && f.moment.getTime() <= horizon).slice(0, 13);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Voorspellingen</h1>

      <Card>
        <H2 icon="drop">Biologische cyclus</H2>
        {analysis.cycles.length === 0 ? (
          <p className="text-sm text-muted">Nog geen menstruatie ingevoerd. Vul in de kalender de eerste dag van je laatste menstruatie in, dan verschijnen hier je voorspellingen.</p>
        ) : (
          <ul className="space-y-3">
            <Row color="bg-period" label="Volgende menstruatie" value={next.period ? formatDayLong(next.period) : '—'} sub={next.period ? (analysis.overdueDays > 0 ? `${analysis.overdueDays} d later dan verwacht` : inDays(diffDays(today, next.period))) : undefined} warn={analysis.overdueDays > 0} />
            <Row color="bg-ovul" label={`Ovulatie${next.ovulationKnown ? ' (uit eigen gegevens)' : ' (verwacht)'}`} value={next.ovulation ? formatDayLong(next.ovulation) : '—'} sub={next.ovulation ? inDays(diffDays(today, next.ovulation)) : undefined} />
            <Row color="bg-ovul-soft" label="Vruchtbaar venster" value={next.fertileStart && next.fertileEnd ? `${formatDayMonth(next.fertileStart)} t/m ${formatDayMonth(next.fertileEnd)}` : '—'} sub={next.fertileStart ? `5 dagen vóór tot 1 dag na de ovulatie` : undefined} />
          </ul>
        )}
        <p className="mt-3 rounded-2xl bg-soft p-3 text-xs leading-snug text-muted">
          {st.usingDefaults
            ? `Gebaseerd op je ingestelde standaard (cyclus ${profile.cycleLength} dagen, menstruatie ${profile.periodLength} dagen). Zodra je meer menstruaties invoert, leert de app van jouw eigen cycli.`
            : `Gebaseerd op ${st.nCycles} eigen ${st.nCycles === 1 ? 'cyclus' : 'cycli'}: gemiddeld ${st.avgCycle.toFixed(1).replace('.', ',')} dagen${st.sdCycle !== undefined ? ` (± ${st.sdCycle.toFixed(1).replace('.', ',')} dag)` : ''}, lutale fase ${Math.round(st.avgLuteal)} dagen${st.nOvulations ? `, ${st.nOvulations} ovulatie(s) bekend` : ''}. Voorspellingen worden nauwkeuriger met elke cyclus.`}
        </p>
      </Card>

      <Card>
        <H2 icon="moon">Maanfase-vruchtbare dagen, komende 12 maanden</H2>
        <ol className="divide-y divide-line">
          {list.map((f) => {
            const dMoment = dayKeyInTz(f.moment, tz);
            const dStart = dayKeyInTz(f.start, tz);
            const dEnd = dayKeyInTz(f.end, tz);
            const utDay = dayKeyInTz(f.moment, 'UTC');
            return (
              <li key={f.moment.toISOString()} className="flex items-start gap-3 py-3">
                <span className="mt-1.5 h-2.5 w-5 shrink-0 rounded-full bg-moon" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold first-letter:uppercase">{formatDayLong(dMoment).replace(/ \d{4}$/, '')}</div>
                  <div className="text-sm text-muted">
                    exact om {formatTimeInTz(f.moment, tz)} ({offsetLabel(f.moment, tz)}) · {formatTimeInTz(f.moment, 'UTC')} UT
                    {utDay !== dMoment ? ` (${formatDayShort(utDay)})` : ''}
                  </div>
                  <div className="text-xs text-muted">
                    venster {formatDayShort(dStart)} {formatTimeInTz(f.start, tz)} – {formatDayShort(dEnd)} {formatTimeInTz(f.end, tz)}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold text-accent">{inDays(diffDays(today, dMoment))}</div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card tone="soft">
        <H2 icon="info">Berekening controleren</H2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Geboorte</dt>
          <dd>{formatDayLong(profile.birthDate)} {profile.birthTime} ({profile.birthTz})</dd>
          <dt className="text-muted">Wereldtijd (UT)</dt>
          <dd>{formatTimeInTz(birthUtc, 'UTC')} ({offsetLabel(birthUtc, profile.birthTz)})</dd>
          <dt className="text-muted">Fase van de Maan</dt>
          <dd className="font-bold">{formatPhase(phase)}{profile.phaseOverride !== undefined ? ' (handmatig)' : ''}</dd>
          <dt className="text-muted">Venster</dt>
          <dd>{settings.windowMode === 'before24' ? '24 uur vóór het moment' : '12 uur voor en na het moment (zoals Astrodienst)'}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted">Vergelijk de momenten hierboven (UT) met de rode vakken in je Astrodienst-kalender. Het venster kun je wijzigen bij Meer → Kalender.</p>
      </Card>

      <Disclaimer />
    </div>
  );
}

function Row({ color, label, value, sub, warn }: { color: string; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 size-3.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-muted">{label}</div>
        <div className="font-bold first-letter:uppercase">{value}</div>
        {sub && <div className={`text-sm font-semibold ${warn ? 'text-moon' : 'text-accent'}`}>{sub}</div>}
      </div>
    </li>
  );
}
