import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { type DayKey, addDays } from './lib/dates';
import { type CycleAnalysis, analyze } from './lib/cycle';
import { type MoonTimeline, buildMoonTimeline } from './lib/moon';
import { birthPhase, birthUtc } from './lib/profile';
import { dayKeyInTz, dayStartUtc } from './lib/tz';
import { type AppData, type Logs, type Profile, type Settings } from './lib/types';

export type Tab = 'vandaag' | 'kalender' | 'voorspel' | 'inzicht' | 'meer';

export interface AppCtx {
  profile: Profile;
  settings: Settings;
  logs: Logs;
  today: DayKey;
  tz: string;
  birthUtc: Date;
  phase: number;
  moon: MoonTimeline;
  analysis: CycleAnalysis;
  openDay: (d: DayKey) => void;
  goTo: (tab: Tab, section?: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp buiten AppProvider');
  return c;
}

/** Dag van vandaag in de gekozen tijdzone; ververst bij middernacht en wanneer de app weer zichtbaar wordt. */
function useToday(tz: string): DayKey {
  const [today, setToday] = useState(() => dayKeyInTz(new Date(), tz));
  useEffect(() => {
    const tick = () => setToday(dayKeyInTz(new Date(), tz));
    tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [tz]);
  return today;
}

export function AppProvider({ data, profile, openDay, goTo, children }: { data: AppData; profile: Profile; openDay: AppCtx['openDay']; goTo: AppCtx['goTo']; children: ReactNode }) {
  const { settings, logs } = data;
  const tz = settings.tz;
  const today = useToday(tz);

  const bUtc = useMemo(() => birthUtc(profile), [profile.birthDate, profile.birthTime, profile.birthTz]); // eslint-disable-line react-hooks/exhaustive-deps
  const phase = useMemo(() => birthPhase(profile), [profile.birthDate, profile.birthTime, profile.birthTz, profile.phaseOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  const earliest = useMemo(() => Object.keys(logs).sort()[0], [logs]);
  const moon = useMemo(() => {
    const back = addDays(today, -1100);
    const from = dayStartUtc(earliest && earliest < back ? addDays(earliest, -40) : back, tz);
    const to = dayStartUtc(addDays(today, 1100), tz);
    return buildMoonTimeline(phase, from, to, tz, settings.windowMode);
  }, [phase, tz, settings.windowMode, today, earliest]);

  const analysis = useMemo(() => analyze(logs, profile, today), [logs, profile.cycleLength, profile.periodLength, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AppCtx>(
    () => ({ profile, settings, logs, today, tz, birthUtc: bUtc, phase, moon, analysis, openDay, goTo }),
    [profile, settings, logs, today, tz, bUtc, phase, moon, analysis, openDay, goTo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
