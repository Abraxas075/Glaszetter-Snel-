import { useMemo, useState } from 'react';
import { type DayKey, isValidKey } from '../lib/dates';
import { formatPhase, phaseFromParts, phaseName, splitDegrees } from '../lib/moon';
import { birthPhase, birthUtc } from '../lib/profile';
import { COMMON_TIMEZONES, allTimezones, dayKeyInTz, formatTimeInTz, offsetLabel } from '../lib/tz';
import type { Profile } from '../lib/types';
import { Button, Field, Stepper, inputCls } from './ui';

export interface ProfileSubmit {
  profile: Profile;
  lastPeriodStart?: DayKey;
}

export function ProfileForm({ initial, onSubmit, submitLabel, askLastPeriod }: { initial: Profile | null; onSubmit: (r: ProfileSubmit) => void; submitLabel: string; askLastPeriod?: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? '');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [place, setPlace] = useState(initial?.birthPlace ?? '');
  const [tz, setTz] = useState(initial?.birthTz ?? 'Europe/Amsterdam');
  const [cycleLength, setCycleLength] = useState(initial?.cycleLength ?? 28);
  const [periodLength, setPeriodLength] = useState(initial?.periodLength ?? 5);
  const [manual, setManual] = useState(initial?.phaseOverride !== undefined);
  const initDeg = initial?.phaseOverride !== undefined ? splitDegrees(initial.phaseOverride) : { deg: 137, min: 1 };
  const [deg, setDeg] = useState(String(initDeg.deg));
  const [min, setMin] = useState(String(initDeg.min));
  const [lastPeriod, setLastPeriod] = useState('');
  const zones = useMemo(() => allTimezones(), []);

  const time = timeUnknown ? '12:00' : birthTime;
  const dateOk = isValidKey(birthDate) && birthDate >= '1900-01-01' && birthDate <= dayKeyInTz(new Date(), 'UTC');
  const timeOk = /^\d{2}:\d{2}$/.test(time);
  const degN = Number(deg);
  const minN = Number(min);
  const manualOk = !manual || (Number.isFinite(degN) && degN >= 0 && degN < 360 && Number.isFinite(minN) && minN >= 0 && minN < 60);
  const valid = dateOk && timeOk && manualOk;

  const draft: Profile | null = valid
    ? { name: name.trim(), birthDate, birthTime: time, birthPlace: place.trim(), birthTz: tz, phaseOverride: manual ? phaseFromParts(degN, minN) : undefined, cycleLength, periodLength }
    : null;
  const preview = draft ? { utc: birthUtc(draft), phase: birthPhase(draft) } : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    onSubmit({ profile: draft, lastPeriodStart: lastPeriod && isValidKey(lastPeriod) ? lastPeriod : undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Naam (optioneel)">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} placeholder="Bijv. Zonna" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Geboortedatum">
          <input className={inputCls} type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} min="1900-01-01" max={dayKeyInTz(new Date(), 'UTC')} />
        </Field>
        <Field label="Geboortetijd">
          <input className={inputCls} type="time" required={!timeUnknown} disabled={timeUnknown} value={timeUnknown ? '12:00' : birthTime} onChange={(e) => setBirthTime(e.target.value)} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-accent" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
        Geboortetijd onbekend (12:00 gebruiken)
      </label>
      {timeUnknown && <p className="rounded-2xl bg-rose/60 p-3 text-xs">De maan verschuift ongeveer 13° per dag. Zonder geboortetijd kan je fasehoek tot ±6,5° afwijken, en de vruchtbare momenten tot ±12 uur.</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Geboorteplaats">
          <input className={inputCls} value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder="Bijv. Amsterdam" autoComplete="off" />
        </Field>
        <Field label="Tijdzone geboorteplaats">
          <select className={inputCls} value={tz} onChange={(e) => setTz(e.target.value)} aria-label="Tijdzone van de geboorteplaats">
            <optgroup label="Veelgebruikt">
              {COMMON_TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {z.replace('_', ' ')}
                </option>
              ))}
            </optgroup>
            <optgroup label="Alle tijdzones">
              {zones.filter((z) => !COMMON_TIMEZONES.includes(z)).map((z) => (
                <option key={z} value={z}>
                  {z.replace('_', ' ')}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
      </div>

      {preview && (
        <div className="rounded-2xl bg-lav/70 p-4 text-sm" aria-live="polite">
          <div className="text-xs font-semibold text-muted">Jouw geboortemaanfase</div>
          <div className="text-3xl font-extrabold text-accent">{formatPhase(preview.phase)}</div>
          <div className="text-muted">
            {phaseName(preview.phase)} · Wereldtijd {formatTimeInTz(preview.utc, 'UTC')} ({offsetLabel(preview.utc, tz)} lokaal)
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-line p-3" open={manual}>
        <summary className="min-h-8 cursor-pointer text-sm font-semibold">Fasehoek handmatig invullen (bijv. uit Astrodienst)</summary>
        <div className="mt-3 space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-accent" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            Mijn eigen waarde gebruiken in plaats van de berekening
          </label>
          {manual && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Graden">
                <input className={inputCls} inputMode="numeric" value={deg} onChange={(e) => setDeg(e.target.value)} />
              </Field>
              <Field label="Boogminuten">
                <input className={inputCls} inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gemiddelde cycluslengte">
          <Stepper label="Cycluslengte" value={cycleLength} onChange={setCycleLength} min={15} max={60} unit="dagen" />
        </Field>
        <Field label="Duur menstruatie">
          <Stepper label="Menstruatieduur" value={periodLength} onChange={setPeriodLength} min={1} max={14} unit="dagen" />
        </Field>
      </div>

      {askLastPeriod && (
        <Field label="Eerste dag van je laatste menstruatie (optioneel)" hint="Hiermee kan de app direct voorspellen.">
          <input className={inputCls} type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} max={dayKeyInTz(new Date(), 'UTC')} />
        </Field>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={!valid} icon="check">
        {submitLabel}
      </Button>
      {!valid && <p className="text-center text-xs text-muted">Vul een geldige geboortedatum en -tijd in.</p>}
    </form>
  );
}
