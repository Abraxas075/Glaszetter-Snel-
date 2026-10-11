import { useMemo, useRef, useState } from 'react';
import { Disclaimer } from '../components/Disclaimer';
import { ProfileForm } from '../components/ProfileForm';
import { Button, Card, Field, H2, Segmented, Toggle, inputCls } from '../components/ui';
import { useApp } from '../context';
import { addMonths, formatDayLong, formatMonthYear, parseKey } from '../lib/dates';
import { notificationsSupported, requestNotificationPermission } from '../lib/notify';
import { downloadPdf } from '../lib/pdf';
import { createPin, verifyPin } from '../lib/pin';
import { formatPhase } from '../lib/moon';
import { buildSheet } from '../lib/sheet';
import { primsToSvg } from '../lib/sheetSvg';
import { exportJson, getData, importJson, replaceAll, resetAll, saveProfile, saveSettings } from '../lib/store';
import { allTimezones } from '../lib/tz';
import type { ThemeSetting } from '../lib/types';

function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function More({ section }: { section?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Meer</h1>
      <ProfileSection />
      <ExportSection autoScroll={section === 'export'} />
      <DisplaySection />
      <NotificationSection />
      <SecuritySection />
      <DataSection />
      <Disclaimer />
      <p className="pb-2 text-center text-xs text-muted">Maanfase Cyclus · alle gegevens blijven lokaal op dit apparaat · berekeningen met astronomy-engine</p>
    </div>
  );
}

/* ---------- profiel ---------- */
function ProfileSection() {
  const { profile, phase, birthUtc } = useApp();
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <H2 icon="star">Profiel</H2>
      {editing ? (
        <ProfileForm
          initial={profile}
          submitLabel="Opslaan"
          onSubmit={({ profile: p }) => {
            saveProfile(p);
            setEditing(false);
          }}
        />
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Naam</dt>
            <dd>{profile.name || '—'}</dd>
            <dt className="text-muted">Geboren</dt>
            <dd>
              {formatDayLong(profile.birthDate)}, {profile.birthTime}
              {profile.birthPlace ? ` · ${profile.birthPlace}` : ''}
            </dd>
            <dt className="text-muted">Wereldtijd</dt>
            <dd>{birthUtc.toISOString().slice(11, 16)} UT</dd>
            <dt className="text-muted">Maanfase</dt>
            <dd className="font-bold text-accent">{formatPhase(phase)}{profile.phaseOverride !== undefined ? ' (handmatig)' : ''}</dd>
            <dt className="text-muted">Cyclus</dt>
            <dd>
              {profile.cycleLength} dagen, menstruatie {profile.periodLength} dagen
            </dd>
          </dl>
          <Button variant="soft" className="mt-3 w-full" onClick={() => setEditing(true)}>
            Profiel wijzigen
          </Button>
        </>
      )}
    </Card>
  );
}

/* ---------- PDF ---------- */
function ExportSection({ autoScroll }: { autoScroll?: boolean }) {
  const { profile, today, tz, moon, analysis, phase, birthUtc } = useApp();
  const t = parseKey(today);
  const [start, setStart] = useState({ y: t.y, m: t.m });
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  if (autoScroll && !scrolled && ref.current) {
    setScrolled(true);
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  const options = useMemo(() => Array.from({ length: 31 }, (_, i) => addMonths(t.y, t.m, i - 6)), [t.y, t.m]);
  const prims = useMemo(
    () => buildSheet({ profile, birthUtc, phase, startYear: start.y, startMonth: start.m, tz, moon, analysis }),
    [profile, birthUtc, phase, start.y, start.m, tz, moon, analysis],
  );
  const svg = useMemo(() => primsToSvg(prims), [prims]);
  const end = addMonths(start.y, start.m, 11);

  return (
    <div ref={ref} id="export" className="scroll-mt-4">
      <Card>
        <H2 icon="print">Jaaroverzicht als PDF</H2>
        <p className="mb-3 text-sm text-muted">12 maanden op één A4 liggend, in de stijl van een maanfase-kalender: blauw = menstruatie, groen = ovulatie, rood = maanfase-vruchtbare dagen.</p>
        <Field label="Eerste maand">
          <select className={inputCls} value={`${start.y}-${start.m}`} onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); setStart({ y, m }); }}>
            {options.map((o) => (
              <option key={`${o.y}-${o.m}`} value={`${o.y}-${o.m}`}>
                {formatMonthYear(o.y, o.m)}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
          <div className="min-w-[640px] [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`Voorbeeld jaaroverzicht ${formatMonthYear(start.y, start.m)} tot ${formatMonthYear(end.y, end.m)}`} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <Button
          variant="primary"
          className="mt-3 w-full"
          icon="download"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadPdf(prims, `maanfase-kalender-${start.y}-${String(start.m).padStart(2, '0')}.pdf`, `Maanfase Vruchtbaarheid Kalender ${formatMonthYear(start.y, start.m)}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'PDF maken…' : 'PDF downloaden'}
        </Button>
      </Card>
    </div>
  );
}

/* ---------- weergave en kalender ---------- */
function DisplaySection() {
  const { settings } = useApp();
  const zones = useMemo(() => allTimezones(), []);
  return (
    <Card>
      <H2 icon="sun">Weergave en kalender</H2>
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-sm font-semibold text-muted">Thema</div>
          <Segmented<ThemeSetting>
            label="Thema"
            value={settings.theme}
            onChange={(theme) => saveSettings({ theme })}
            options={[{ value: 'auto', label: 'Automatisch' }, { value: 'light', label: 'Licht' }, { value: 'dark', label: 'Donker' }]}
          />
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-muted">Maanfase-venster (rood)</div>
          <Segmented
            label="Maanfase-venster"
            value={settings.windowMode}
            onChange={(windowMode) => saveSettings({ windowMode })}
            options={[{ value: 'before24', label: '24 u ervoor' }, { value: 'centered24', label: '±12 u (Astrodienst)' }]}
          />
          <p className="mt-1.5 text-xs text-muted">
            {settings.windowMode === 'before24'
              ? 'Rood loopt van 24 uur vóór tot het exacte moment waarop de maan weer je geboortefase heeft.'
              : 'Rood loopt van 12 uur vóór tot 12 uur na het exacte moment. Zo is het rode vak getekend in de Astrodienst-kalender.'}
          </p>
        </div>
        <Field label="Tijdzone voor de dagindeling" hint="Standaard Europe/Amsterdam. Bepaalt op welke kalenderdag een maanfase-moment valt.">
          <select className={inputCls} value={settings.tz} onChange={(e) => saveSettings({ tz: e.target.value })}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Card>
  );
}

/* ---------- meldingen ---------- */
function NotificationSection() {
  const { settings } = useApp();
  const n = settings.notifications;
  const [msg, setMsg] = useState('');
  const supported = notificationsSupported();
  const set = (patch: Partial<typeof n>) => saveSettings({ notifications: { ...n, ...patch } });

  return (
    <Card>
      <H2 icon="bell">Meldingen</H2>
      {!supported ? (
        <p className="text-sm text-muted">Dit apparaat of deze browser ondersteunt geen meldingen voor webapps.</p>
      ) : (
        <>
          <Toggle
            label="Meldingen aan"
            checked={n.enabled}
            onChange={async (v) => {
              setMsg('');
              if (v) {
                const p = await requestNotificationPermission();
                if (p !== 'granted') {
                  setMsg('Toestemming voor meldingen is geweigerd. Zet die aan in de instellingen van je browser of telefoon.');
                  return;
                }
              }
              set({ enabled: v });
            }}
          />
          {msg && <p className="rounded-2xl bg-moon-soft p-3 text-sm" role="alert">{msg}</p>}
          {n.enabled && (
            <div className="mt-1 divide-y divide-line">
              <Toggle label="2 dagen vóór je menstruatie" checked={n.menstruation} onChange={(menstruation) => set({ menstruation })} />
              <Toggle label="Maanfase-vruchtbare dagen" checked={n.moonFertile} onChange={(moonFertile) => set({ moonFertile })} />
              <Toggle label="Biologisch vruchtbaar venster" checked={n.bioFertile} onChange={(bioFertile) => set({ bioFertile })} />
              <div className="pt-3">
                <Field label="Tijdstip van de melding">
                  <input className={inputCls} type="time" value={n.time} onChange={(e) => e.target.value && set({ time: e.target.value })} />
                </Field>
              </div>
            </div>
          )}
          <p className="mt-3 rounded-2xl bg-soft p-3 text-xs leading-snug text-muted">
            Zonder server kan de app niet altijd op de achtergrond een melding sturen. Meldingen verschijnen zodra je de app opent, en bij een geïnstalleerde app in Chrome op Android ook af en toe op de achtergrond. Op iPhone: zet de app eerst op je beginscherm.
          </p>
        </>
      )}
    </Card>
  );
}

/* ---------- pincode ---------- */
function SecuritySection() {
  const { settings } = useApp();
  const [mode, setMode] = useState<'idle' | 'set' | 'remove'>('idle');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [cur, setCur] = useState('');
  const [err, setErr] = useState('');
  const has = !!settings.pin;
  const reset = () => {
    setMode('idle');
    setPin('');
    setPin2('');
    setCur('');
    setErr('');
  };

  const save = async () => {
    if (!/^\d{4,6}$/.test(pin)) return setErr('Kies 4 tot 6 cijfers.');
    if (pin !== pin2) return setErr('De pincodes komen niet overeen.');
    if (has && !(await verifyPin(cur, settings.pin!))) return setErr('Huidige pincode klopt niet.');
    saveSettings({ pin: await createPin(pin) });
    reset();
  };
  const remove = async () => {
    if (!(await verifyPin(cur, settings.pin!))) return setErr('Pincode klopt niet.');
    saveSettings({ pin: undefined });
    reset();
  };

  return (
    <Card>
      <H2 icon="lock">Pincode</H2>
      <p className="mb-3 text-sm text-muted">Vraag bij het openen van de app om een pincode. Dit houdt meekijkers buiten; de gegevens op je apparaat zelf worden er niet door versleuteld.</p>
      {mode === 'idle' && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => setMode('set')}>
            {has ? 'Wijzigen' : 'Pincode instellen'}
          </Button>
          {has && (
            <Button variant="danger" onClick={() => setMode('remove')}>
              Verwijderen
            </Button>
          )}
        </div>
      )}
      {mode !== 'idle' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void (mode === 'set' ? save() : remove());
          }}
        >
          {(has || mode === 'remove') && (
            <Field label="Huidige pincode">
              <input className={inputCls} type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={cur} onChange={(e) => setCur(e.target.value.replace(/\D/g, ''))} />
            </Field>
          )}
          {mode === 'set' && (
            <>
              <Field label="Nieuwe pincode (4–6 cijfers)">
                <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              </Field>
              <Field label="Herhaal pincode">
                <input className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
              </Field>
            </>
          )}
          {err && <p className="text-sm text-moon" role="alert">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={reset}>
              Annuleren
            </Button>
            <Button type="submit" variant="primary">
              Opslaan
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ---------- back-up ---------- */
function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = importJson(await file.text(), getData().settings.pin);
      const days = Object.keys(data.logs).length;
      if (!window.confirm(`Back-up importeren? Dit vervangt je huidige gegevens (${days} dagboekdagen in het bestand).`)) return;
      replaceAll(data);
      setMsg({ ok: true, text: `Back-up geïmporteerd (${days} dagen).` });
    } catch (e) {
      setMsg({ ok: false, text: `Importeren mislukt: ${e instanceof Error ? e.message : 'onbekend bestand'}` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <H2 icon="download">Back-up en gegevens</H2>
      <p className="mb-3 text-sm text-muted">Je gegevens staan alleen op dit apparaat. Maak regelmatig een back-upbestand (zonder pincode) om ze te bewaren of naar een ander apparaat te verhuizen.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" icon="download" onClick={() => download(`maanfase-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJson(), 'application/json')}>
          Exporteren
        </Button>
        <Button variant="soft" icon="upload" onClick={() => fileRef.current?.click()}>
          Importeren
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Back-upbestand kiezen" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {msg && (
        <p className={`mt-3 rounded-2xl p-3 text-sm ${msg.ok ? 'bg-ovul-soft' : 'bg-moon-soft'}`} role="status">
          {msg.text}
        </p>
      )}
      <Button
        variant="danger"
        className="mt-3 w-full"
        icon="trash"
        onClick={() => {
          if (window.confirm('Alle gegevens op dit apparaat wissen? Dit kan niet ongedaan worden gemaakt. Maak eerst een back-up als je die nog wilt hebben.')) resetAll();
        }}
      >
        Alle gegevens wissen
      </Button>
    </Card>
  );
}
