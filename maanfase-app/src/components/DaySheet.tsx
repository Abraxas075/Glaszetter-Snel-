import { useEffect, useState } from 'react';
import { type DayKey, addDays, diffDays, formatDayLong, formatDayShort } from '../lib/dates';
import { useApp } from '../context';
import { clearPeriodDay, endPeriod, startPeriod } from '../lib/periods';
import { patchLogs, setLog } from '../lib/store';
import { dayKeyInTz, formatTimeInTz, offsetLabel } from '../lib/tz';
import type { DayLog, Flow, LhTest, Mucus, Severity, SymptomKey } from '../lib/types';
import { Button, Chip, Icon, Segmented, Sheet } from './ui';

const FLOWS: { value: Flow; label: string }[] = [
  { value: 'licht', label: 'Licht' },
  { value: 'normaal', label: 'Normaal' },
  { value: 'zwaar', label: 'Zwaar' },
];
const MUCUS: { value: Mucus; label: string }[] = [
  { value: 'droog', label: 'Droog' },
  { value: 'kleverig', label: 'Kleverig' },
  { value: 'romig', label: 'Romig' },
  { value: 'waterig', label: 'Waterig' },
  { value: 'eiwit', label: 'Eiwitachtig' },
];
const SYMPTOMS: { key: SymptomKey; label: string }[] = [
  { key: 'buikpijn', label: 'Buikpijn' },
  { key: 'hoofdpijn', label: 'Hoofdpijn' },
  { key: 'vermoeidheid', label: 'Vermoeidheid' },
];
const SEVERITY: { value: Severity; label: string }[] = [
  { value: 0, label: 'Geen' },
  { value: 1, label: 'Licht' },
  { value: 2, label: 'Matig' },
  { value: 3, label: 'Erg' },
];
const MOODS = ['Blij', 'Kalm', 'Gevoelig', 'Prikkelbaar', 'Angstig', 'Somber'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function BbtInput({ day, value, onChange, fallback }: { day: DayKey; value?: number; onChange: (v: number | undefined) => void; fallback: number }) {
  const fmt = (v?: number) => (v === undefined ? '' : v.toFixed(2).replace('.', ','));
  const [text, setText] = useState(fmt(value));
  useEffect(() => setText(fmt(value)), [day, value]);

  const commit = (raw: string) => {
    const t = raw.trim().replace(',', '.');
    if (t === '') return onChange(undefined);
    const n = Number(t);
    if (Number.isFinite(n) && n >= 34 && n <= 42) onChange(Math.round(n * 100) / 100);
  };
  const step = (d: number) => {
    const base = value ?? fallback;
    const n = Math.min(42, Math.max(34, Math.round((base + d) * 100) / 100));
    onChange(n);
  };
  const invalid = text.trim() !== '' && !(Number(text.replace(',', '.')) >= 34 && Number(text.replace(',', '.')) <= 42);
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Temperatuur 0,05 lager" onClick={() => step(-0.05)} className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon name="minus" />
      </button>
      <div className="relative flex-1">
        <input
          inputMode="decimal"
          aria-label="Basale temperatuur in graden Celsius"
          aria-invalid={invalid}
          placeholder="36,50"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(fmt(value))}
          className={`block min-h-12 w-full rounded-2xl border bg-card px-4 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 ${invalid ? 'border-moon' : 'border-line'}`}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">°C</span>
      </div>
      <button type="button" aria-label="Temperatuur 0,05 hoger" onClick={() => step(0.05)} className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon name="plus" />
      </button>
    </div>
  );
}

export function DaySheet({ day, onClose }: { day: DayKey; onClose: () => void }) {
  const { logs, today, tz, moon, analysis, profile, openDay } = useApp();
  const log: DayLog = logs[day] ?? {};
  const [note, setNote] = useState(log.note ?? '');
  useEffect(() => setNote(logs[day]?.note ?? ''), [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (patch: Partial<DayLog>) => {
    const next: DayLog = { ...(logs[day] ?? {}), ...patch };
    (Object.keys(next) as (keyof DayLog)[]).forEach((k) => next[k] === undefined && delete next[k]);
    setLog(day, next);
  };
  const toggleSym = (key: SymptomKey, v: Severity) => {
    const symptoms = { ...(log.symptoms ?? {}) };
    if (v === 0) delete symptoms[key];
    else symptoms[key] = v;
    upd({ symptoms: Object.keys(symptoms).length ? symptoms : undefined });
  };

  const isPeriod = !!log.flow;
  const mk = analysis.marks.get(day);
  const peak = moon.fertile.find((f) => dayKeyInTz(f.start, tz) <= day && day <= dayKeyInTz(f.end, tz));
  const cur = analysis.cycles.filter((c) => c.start <= day).slice(-1)[0];
  const cycleDay = cur && (cur.nextStart ? day < cur.nextStart : diffDays(cur.start, day) < 90) ? diffDays(cur.start, day) + 1 : undefined;
  const lastBbt = Object.keys(logs).filter((d) => logs[d].bbt !== undefined && d < day).sort().slice(-1)[0];

  const rel = diffDays(today, day);
  const relLabel = rel === 0 ? 'Vandaag' : rel === -1 ? 'Gisteren' : rel === 1 ? 'Morgen' : null;

  return (
    <Sheet
      onClose={onClose}
      title={
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Vorige dag" onClick={() => openDay(addDays(day, -1))} className="grid size-11 place-items-center rounded-full text-muted active:bg-soft">
            <Icon name="left" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-lg font-extrabold first-letter:uppercase leading-tight">{formatDayLong(day)}</div>
            <div className="text-xs text-muted">{[relLabel, cycleDay ? `cyclusdag ${cycleDay}` : null].filter(Boolean).join(' · ') || ' '}</div>
          </div>
          <button type="button" aria-label="Volgende dag" onClick={() => openDay(addDays(day, 1))} className="grid size-11 place-items-center rounded-full text-muted active:bg-soft">
            <Icon name="right" />
          </button>
        </div>
      }
      footer={
        <Button variant="primary" className="w-full" onClick={onClose} icon="check">
          Klaar
        </Button>
      }
    >
      {/* wat de app voor deze dag weet */}
      {(peak || mk?.fertile || mk?.ovulation || mk?.period === 'predicted') && (
        <div className="mt-1 space-y-1.5 rounded-2xl bg-soft p-3 text-sm">
          {peak && (
            <p className="flex gap-2">
              <span className="mt-1.5 h-2 w-4 shrink-0 rounded-full bg-moon" />
              <span>
                <b>Maanfase-vruchtbaar:</b> exact moment {formatDayLong(dayKeyInTz(peak.moment, tz)).replace(/ \d{4}$/, '')} {formatTimeInTz(peak.moment, tz)} ({offsetLabel(peak.moment, tz)}), venster {formatDayShort(dayKeyInTz(peak.start, tz))} {formatTimeInTz(peak.start, tz)} – {formatDayShort(dayKeyInTz(peak.end, tz))} {formatTimeInTz(peak.end, tz)}.
              </span>
            </p>
          )}
          {mk?.fertile && (
            <p className="flex gap-2">
              <span className="hatch-green mt-1 size-3 shrink-0 rounded border border-ovul/40" />
              <span>{mk.fertile === 'actual' ? 'Vruchtbaar venster (uit je eigen ovulatie)' : 'Verwacht vruchtbaar venster (biologisch)'}</span>
            </p>
          )}
          {mk?.ovulation && (
            <p className="flex gap-2">
              <span className="mt-1 size-3 shrink-0 rounded-full bg-ovul" />
              <span>{mk.ovulation === 'predicted' ? 'Verwachte ovulatie' : mk.ovulation === 'estimated' ? 'Ovulatie geschat uit je ovulatietest of temperatuur' : 'Ovulatie (door jou gemarkeerd)'}</span>
            </p>
          )}
          {mk?.period === 'predicted' && (
            <p className="flex gap-2">
              <span className="hatch-blue mt-1 size-3 shrink-0 rounded border border-dashed border-period" />
              <span>Menstruatie verwacht</span>
            </p>
          )}
        </div>
      )}

      <Section title="Menstruatie">
        {!isPeriod ? (
          <Button variant="period" className="w-full" icon="drop" onClick={() => patchLogs(startPeriod(logs, day, today, Math.round(analysis.stats.avgPeriod || profile.periodLength)))}>
            Menstruatie start {rel === 0 ? 'vandaag' : 'op deze dag'}
          </Button>
        ) : (
          <div className="space-y-2">
            <Segmented label="Hevigheid" value={log.flow} options={FLOWS} onChange={(v) => upd({ flow: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="soft" onClick={() => patchLogs(endPeriod(logs, day))}>
                Einde menstruatie
              </Button>
              <Button variant="ghost" onClick={() => patchLogs(clearPeriodDay(logs, day))}>
                Geen menstruatie
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Ovulatie">
        <div className="space-y-2">
          <Chip active={!!log.ovulation} tone="ovul" onClick={() => upd({ ovulation: log.ovulation ? undefined : true })}>
            {log.ovulation ? '✓ Ovulatie op deze dag' : 'Ovulatie markeren'}
          </Chip>
          <div>
            <div className="mb-1 text-sm font-semibold text-muted">Ovulatietest (LH)</div>
            <Segmented<LhTest> label="Ovulatietest" value={log.lh} options={[{ value: 'negatief', label: 'Negatief' }, { value: 'positief', label: 'Positief' }]} onChange={(v) => upd({ lh: log.lh === v ? undefined : v })} />
          </div>
        </div>
      </Section>

      <Section title="Basale temperatuur">
        <BbtInput day={day} value={log.bbt} onChange={(v) => upd({ bbt: v })} fallback={lastBbt ? (logs[lastBbt].bbt as number) : 36.5} />
      </Section>

      <Section title="Cervixslijm">
        <div className="flex flex-wrap gap-2">
          {MUCUS.map((o) => (
            <Chip key={o.value} active={log.mucus === o.value} onClick={() => upd({ mucus: log.mucus === o.value ? undefined : o.value })}>
              {o.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Klachten">
        <div className="space-y-3">
          {SYMPTOMS.map((s) => (
            <div key={s.key}>
              <div className="mb-1 text-sm font-semibold">{s.label}</div>
              <Segmented label={s.label} value={(log.symptoms?.[s.key] ?? 0) as Severity} options={SEVERITY} onChange={(v) => toggleSym(s.key, v)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stemming">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m} active={log.mood?.includes(m)} onClick={() => upd({ mood: log.mood?.includes(m) ? (log.mood.filter((x) => x !== m).length ? log.mood.filter((x) => x !== m) : undefined) : [...(log.mood ?? []), m] })}>
              {m}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Energie">
        <Segmented
          label="Energie"
          value={log.energy}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n as 1 | 2 | 3 | 4 | 5, label: String(n) }))}
          onChange={(v) => upd({ energy: log.energy === v ? undefined : v })}
        />
        <div className="mt-1 flex justify-between px-1 text-xs text-muted">
          <span>laag</span>
          <span>hoog</span>
        </div>
      </Section>

      <Section title="Notitie">
        <textarea
          aria-label="Notitie"
          value={note}
          rows={3}
          maxLength={2000}
          placeholder="Schrijf hier iets op…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => upd({ note: note.trim() ? note : undefined })}
          className="block w-full rounded-2xl border border-line bg-card px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </Section>
    </Sheet>
  );
}
