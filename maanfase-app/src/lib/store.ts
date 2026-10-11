import { useSyncExternalStore } from 'react';
import { type DayKey, isValidKey } from './dates';
import { isValidTz } from './tz';
import { type AppData, type DayLog, DEFAULT_SETTINGS, type Logs, type Profile, type Settings, emptyData } from './types';
import type { WindowMode } from './moon';

const KEY = 'maanfase.v1';
const FLOWS = ['licht', 'normaal', 'zwaar'];
const MUCUS = ['droog', 'kleverig', 'romig', 'waterig', 'eiwit'];
const SYMPTOMS = ['buikpijn', 'hoofdpijn', 'vermoeidheid'];
type Listener = () => void;

/** Lazy ingelezen: pas bij het eerste gebruik, zodat alle functies en constanten in deze module bestaan. */
let current: AppData | undefined;
const listeners = new Set<Listener>();

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw), true);
  } catch {
    /* beschadigde of geblokkeerde opslag: begin leeg */
  }
  return emptyData();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(getData()));
  } catch (e) {
    console.error('Opslaan mislukt', e);
  }
}

function commit(next: AppData) {
  current = next;
  persist();
  listeners.forEach((l) => l());
}

export function getData(): AppData {
  return (current ??= load());
}

export function useData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getData,
  );
}

/* ---------- acties ---------- */
export function saveProfile(profile: Profile) {
  commit({ ...getData(), profile });
}

export function saveSettings(patch: Partial<Settings>) {
  const d = getData();
  commit({ ...d, settings: { ...d.settings, ...patch } });
}

const isEmptyLog = (l: DayLog) =>
  !l.flow && !l.ovulation && !l.lh && l.bbt === undefined && !l.mucus && !(l.mood && l.mood.length) && l.energy === undefined && !l.note?.trim() &&
  !Object.values(l.symptoms ?? {}).some((v) => v);

/** Vervangt het dagboek van één dag; een lege dag wordt verwijderd. */
export function setLog(day: DayKey, log: DayLog) {
  const logs: Logs = { ...getData().logs };
  if (isEmptyLog(log)) delete logs[day];
  else logs[day] = log;
  commit({ ...getData(), logs });
}

export function patchLogs(patches: Record<DayKey, DayLog | null>) {
  const logs: Logs = { ...getData().logs };
  for (const [d, l] of Object.entries(patches)) {
    if (l === null || isEmptyLog(l)) delete logs[d];
    else logs[d] = l;
  }
  commit({ ...getData(), logs });
}

export function resetAll() {
  commit(emptyData());
}

export function replaceAll(data: AppData) {
  commit(data);
}

/* ---------- export / import ---------- */
export const BACKUP_TYPE = 'maanfase-backup';

/** Back-up bevat nooit de pincode. */
export function exportJson(data: AppData = getData()): string {
  const { pin: _pin, ...settings } = data.settings;
  void _pin;
  return JSON.stringify({ type: BACKUP_TYPE, exportedAt: new Date().toISOString(), data: { ...data, settings } }, null, 2);
}

export function importJson(text: string, keepPin?: Settings['pin']): AppData {
  const parsed = JSON.parse(text);
  const payload = parsed?.type === BACKUP_TYPE ? parsed.data : parsed;
  const data = sanitize(payload, false);
  if (keepPin) data.settings.pin = keepPin;
  return data;
}

/* ---------- validatie ---------- */
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;

function sanitizeLog(raw: unknown): DayLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const log: DayLog = {};
  if (typeof r.flow === 'string' && FLOWS.includes(r.flow)) log.flow = r.flow as DayLog['flow'];
  if (r.ovulation === true) log.ovulation = true;
  if (r.lh === 'positief' || r.lh === 'negatief') log.lh = r.lh;
  const bbt = num(r.bbt, 30, 43);
  if (bbt !== undefined) log.bbt = bbt;
  if (typeof r.mucus === 'string' && MUCUS.includes(r.mucus)) log.mucus = r.mucus as DayLog['mucus'];
  if (r.symptoms && typeof r.symptoms === 'object') {
    const s: NonNullable<DayLog['symptoms']> = {};
    for (const k of SYMPTOMS) {
      const v = (r.symptoms as Record<string, unknown>)[k];
      if (v === 1 || v === 2 || v === 3) s[k as keyof typeof s] = v;
    }
    if (Object.keys(s).length) log.symptoms = s;
  }
  if (Array.isArray(r.mood)) log.mood = r.mood.filter((m): m is string => typeof m === 'string').slice(0, 10);
  const e = num(r.energy, 1, 5);
  if (e !== undefined) log.energy = Math.round(e) as DayLog['energy'];
  if (typeof r.note === 'string' && r.note.trim()) log.note = r.note.slice(0, 2000);
  return log;
}

function sanitizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (!isValidKey(p.birthDate)) return null;
  const tz = typeof p.birthTz === 'string' && isValidTz(p.birthTz) ? p.birthTz : 'Europe/Amsterdam';
  const time = typeof p.birthTime === 'string' && /^\d{2}:\d{2}$/.test(p.birthTime) ? p.birthTime : '12:00';
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 80) : '',
    birthDate: p.birthDate,
    birthTime: time,
    birthPlace: typeof p.birthPlace === 'string' ? p.birthPlace.slice(0, 120) : '',
    birthTz: tz,
    phaseOverride: num(p.phaseOverride, 0, 360),
    cycleLength: Math.round(num(p.cycleLength, 15, 60) ?? 28),
    periodLength: Math.round(num(p.periodLength, 1, 14) ?? 5),
  };
}

function sanitizeSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (r.notifications ?? {}) as Record<string, unknown>;
  const pin = r.pin as Record<string, unknown> | undefined;
  const base = DEFAULT_SETTINGS;
  const settings: Settings = {
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'auto' ? r.theme : base.theme,
    tz: typeof r.tz === 'string' && isValidTz(r.tz) ? r.tz : base.tz,
    windowMode: (r.windowMode === 'centered24' || r.windowMode === 'before24' ? r.windowMode : base.windowMode) as WindowMode,
    notifications: {
      enabled: n.enabled === true,
      menstruation: n.menstruation !== false,
      moonFertile: n.moonFertile !== false,
      bioFertile: n.bioFertile !== false,
      time: typeof n.time === 'string' && /^\d{2}:\d{2}$/.test(n.time) ? n.time : base.notifications.time,
    },
  };
  if (pin && typeof pin.salt === 'string' && typeof pin.hash === 'string' && typeof pin.iterations === 'number') {
    settings.pin = { salt: pin.salt, hash: pin.hash, iterations: pin.iterations };
  }
  return settings;
}

export function sanitize(raw: unknown, allowPin: boolean): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Onbekend bestandsformaat');
  const r = raw as Record<string, unknown>;
  if (r.logs !== undefined && (typeof r.logs !== 'object' || r.logs === null)) throw new Error('Ongeldige dagboekgegevens');
  const logs: Logs = {};
  for (const [k, v] of Object.entries((r.logs ?? {}) as Record<string, unknown>)) {
    if (!isValidKey(k)) continue;
    const log = sanitizeLog(v);
    if (!isEmptyLog(log)) logs[k] = log;
  }
  const settings = sanitizeSettings(r.settings);
  if (!allowPin) delete settings.pin;
  return { version: 1, profile: sanitizeProfile(r.profile), logs, settings };
}
