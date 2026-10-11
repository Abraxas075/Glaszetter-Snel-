import { addDays, diffDays, formatDayLong, formatDayShort } from '../lib/dates';
import { Button, Card, H2, Icon, MoonDot } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';
import { useApp } from '../context';
import { nextEvents } from '../lib/cycle';
import { formatPhase, moonPhaseAngle, phaseName } from '../lib/moon';
import { clearPeriodDay, endPeriod, startPeriod } from '../lib/periods';
import { patchLogs, setLog } from '../lib/store';
import { dayKeyInTz, formatTimeInTz } from '../lib/tz';

const inDays = (n: number) => (n === 0 ? 'vandaag' : n === 1 ? 'morgen' : n === -1 ? 'gisteren' : n > 0 ? `over ${n} dagen` : `${-n} dagen geleden`);

export default function Today() {
  const { profile, logs, today, tz, moon, analysis, phase, openDay } = useApp();
  const log = logs[today] ?? {};
  const next = nextEvents(analysis, today);
  const periodToday = !!log.flow;
  const now = new Date();
  const moonNow = moonPhaseAngle(now);

  // maanfase-venster: nu bezig, of eerstvolgende
  const active = moon.fertile.find((f) => f.start <= now && now <= f.end);
  const upcoming = moon.fertile.find((f) => f.end > now);
  const moonDays = upcoming ? diffDays(today, dayKeyInTz(upcoming.start, tz)) : undefined;

  const inFertile = next.fertileStart && next.fertileEnd && today >= next.fertileStart && today <= next.fertileEnd;
  const lutealOrFollicular = analysis.cycleDay !== undefined;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold first-letter:uppercase text-muted">{formatDayLong(today)}</p>
        <h1 className="text-2xl font-extrabold">{profile.name ? `Hoi ${profile.name}` : 'Hoi'} 🌙</h1>
      </header>

      <Card tone="lav" className="!p-5">
        {lutealOrFollicular ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-muted">Cyclusdag</div>
                <div className="text-5xl font-extrabold leading-none">{analysis.cycleDay}</div>
              </div>
              {analysis.cycleDay! > 0 && <div className="text-right text-sm text-muted">gem. cyclus {analysis.stats.avgCycle.toFixed(analysis.stats.nCycles ? 1 : 0).replace('.', ',')} dagen</div>}
            </div>
            <div className="mt-4 space-y-1.5 text-base">
              {next.period && (
                <p>
                  <Icon name="drop" className="mr-1 inline size-4 text-period" />
                  {analysis.overdueDays > 0 ? (
                    <b className="text-moon">Menstruatie {analysis.overdueDays} {analysis.overdueDays === 1 ? 'dag' : 'dagen'} later dan verwacht</b>
                  ) : (
                    <>
                      Volgende menstruatie <b>{inDays(diffDays(today, next.period))}</b> ({formatDayShort(next.period)})
                    </>
                  )}
                </p>
              )}
              {inFertile ? (
                <p>
                  <span className="mr-1.5 inline-block size-3 rounded-full bg-ovul align-middle" />
                  Je zit nu in je <b>vruchtbare venster</b> (t/m {formatDayShort(next.fertileEnd!)}).
                </p>
              ) : next.ovulation ? (
                <p>
                  <span className="mr-1.5 inline-block size-3 rounded-full border-2 border-ovul align-middle" />
                  Ovulatie {next.ovulationKnown ? '' : 'verwacht '}<b>{inDays(diffDays(today, next.ovulation))}</b> ({formatDayShort(next.ovulation)})
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-lg font-bold">Begin met je cyclus</h2>
            <p className="mt-1 text-sm text-muted">Tik hieronder op de eerste dag van je laatste menstruatie om voorspellingen te krijgen. Hoe meer cycli je invoert, hoe nauwkeuriger de app wordt.</p>
          </div>
        )}
      </Card>

      <section aria-label="Snel invullen" className="grid grid-cols-2 gap-3">
        {periodToday ? (
          <Button variant="soft" className="!min-h-20 flex-col !gap-1" onClick={() => patchLogs(endPeriod(logs, today))}>
            <Icon name="check" className="size-6" />
            Menstruatie voorbij
          </Button>
        ) : (
          <Button variant="period" className="!min-h-20 flex-col !gap-1" onClick={() => patchLogs(startPeriod(logs, today, today, Math.round(analysis.stats.avgPeriod || profile.periodLength)))}>
            <Icon name="drop" className="size-6" />
            Menstruatie gestart
          </Button>
        )}
        <Button variant="soft" className="!min-h-20 flex-col !gap-1" onClick={() => openDay(today)}>
          <Icon name="list" className="size-6" />
          Dagboek vandaag
        </Button>
        <Button variant={log.lh === 'positief' ? 'primary' : 'soft'} className="!min-h-16" onClick={() => setLog(today, { ...log, lh: log.lh === 'positief' ? undefined : 'positief' })}>
          Ovulatietest +
        </Button>
        <Button variant={log.lh === 'negatief' ? 'primary' : 'soft'} className="!min-h-16" onClick={() => setLog(today, { ...log, lh: log.lh === 'negatief' ? undefined : 'negatief' })}>
          Ovulatietest −
        </Button>
        {periodToday && (
          <Button variant="ghost" className="col-span-2 !min-h-11 text-sm" onClick={() => patchLogs(clearPeriodDay(logs, today))}>
            Toch geen menstruatie vandaag
          </Button>
        )}
        {!analysis.cycleDay && (
          <Button variant="ghost" className="col-span-2" onClick={() => openDay(addDays(today, -1))}>
            Mijn menstruatie begon eerder…
          </Button>
        )}
      </section>

      <Card>
        <H2 icon="moon">Maanfase (methode Jonas)</H2>
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft text-2xl" aria-hidden="true">
            {moonEmoji(moonNow)}
          </div>
          <div className="text-sm">
            <div className="font-semibold">
              {phaseName(moonNow)} · {formatPhase(moonNow)}
            </div>
            <div className="text-muted">Jouw geboortefase: {formatPhase(phase)}</div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-soft p-3 text-sm">
          {active ? (
            <p>
              <span className="mr-2 inline-block h-2 w-5 rounded-full bg-moon align-middle" />
              <b>Nu is je maanfase-venster actief</b> tot {formatDayShort(dayKeyInTz(active.end, tz))} {formatTimeInTz(active.end, tz)}. Exact moment: {formatDayShort(dayKeyInTz(active.moment, tz))} {formatTimeInTz(active.moment, tz)}.
            </p>
          ) : upcoming ? (
            <p>
              <span className="mr-2 inline-block h-2 w-5 rounded-full bg-moon align-middle" />
              Volgende maanfase-vruchtbare dag: <b>{formatDayShort(dayKeyInTz(upcoming.moment, tz))}</b> om {formatTimeInTz(upcoming.moment, tz)} ({moonDays !== undefined && moonDays > 0 ? inDays(moonDays) : 'binnenkort'}).
            </p>
          ) : null}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <MoonDot kind="new" /> nieuwe maan <MoonDot kind="full" /> volle maan staan in de kalender
        </p>
      </Card>

      <Disclaimer />
    </div>
  );
}

function moonEmoji(a: number) {
  const i = Math.round(((a % 360) + 360) % 360 / 45) % 8;
  return ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][i];
}
