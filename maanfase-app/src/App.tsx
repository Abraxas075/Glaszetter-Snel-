import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DaySheet } from './components/DaySheet';
import { Icon, type IconName } from './components/ui';
import { AppProvider, type Tab, useApp } from './context';
import type { DayKey } from './lib/dates';
import { notificationsSupported, showDueReminders, syncSchedule } from './lib/notify';
import { buildReminders } from './lib/reminders';
import { getData, useData } from './lib/store';
import type { ThemeSetting } from './lib/types';
import CalendarScreen from './screens/CalendarScreen';
import Insights from './screens/Insights';
import Lock from './screens/Lock';
import More from './screens/More';
import Onboarding from './screens/Onboarding';
import Predictions from './screens/Predictions';
import Today from './screens/Today';

const LOCK_AFTER_MS = 60_000;

function useTheme(theme: ThemeSetting) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14101b' : '#c4b5fd');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const data = useData();
  useTheme(data.settings.theme);
  const [locked, setLocked] = useState(() => !!getData().settings.pin);
  const hiddenAt = useRef<number | null>(null);
  const hasPin = !!data.settings.pin;

  // opnieuw vergrendelen als de app een tijd op de achtergrond stond
  useEffect(() => {
    if (!hasPin) return;
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hasPin]);

  if (hasPin && locked) return <Lock pin={data.settings.pin!} onUnlock={() => setLocked(false)} />;
  if (!data.profile) return <Onboarding />;
  return <Main />;
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'vandaag', label: 'Vandaag', icon: 'home' },
  { id: 'kalender', label: 'Kalender', icon: 'calendar' },
  { id: 'voorspel', label: 'Voorspel', icon: 'moon' },
  { id: 'inzicht', label: 'Overzicht', icon: 'chart' },
  { id: 'meer', label: 'Meer', icon: 'sliders' },
];

function Main() {
  const data = useData();
  const [tab, setTab] = useState<Tab>('vandaag');
  const [section, setSection] = useState<string | undefined>();
  const [day, setDay] = useState<DayKey | null>(null);
  const goTo = useCallback((t: Tab, s?: string) => {
    setTab(t);
    setSection(s);
    if (!s) window.scrollTo({ top: 0 });
  }, []);
  const openDay = useCallback((d: DayKey) => setDay(d), []);

  return (
    <AppProvider data={data} profile={data.profile!} openDay={openDay} goTo={goTo}>
      <Reminders />
      <div className="mx-auto min-h-dvh max-w-xl px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <main>
          {tab === 'vandaag' && <Today />}
          {tab === 'kalender' && <CalendarScreen />}
          {tab === 'voorspel' && <Predictions />}
          {tab === 'inzicht' && <Insights />}
          {tab === 'meer' && <More section={section} />}
        </main>
      </div>
      <nav aria-label="Hoofdmenu" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex h-[4.5rem] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${tab === t.id ? 'text-accent' : 'text-muted'}`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${tab === t.id ? 'bg-accent-soft' : ''}`}>
                  <Icon name={t.icon} className="size-6" />
                </span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {day && <DaySheet day={day} onClose={() => setDay(null)} />}
    </AppProvider>
  );
}

/** Houdt het meldingsschema bij en toont verstreken meldingen zodra de app open is. */
function Reminders() {
  const { analysis, moon, settings, tz } = useApp();
  const n = settings.notifications;
  const reminders = useMemo(() => buildReminders({ analysis, moon, settings: n, tz, now: new Date() }), [analysis, moon, n, tz]);

  useEffect(() => {
    if (!n.enabled || !notificationsSupported()) return;
    void syncSchedule(reminders).catch(() => undefined);
    const check = () => void showDueReminders(reminders).catch(() => undefined);
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [reminders, n.enabled]);

  return null;
}
