import type { DayKey } from './dates';
import type { WindowMode } from './moon';

export type Flow = 'licht' | 'normaal' | 'zwaar';
export type Mucus = 'droog' | 'kleverig' | 'romig' | 'waterig' | 'eiwit';
export type LhTest = 'positief' | 'negatief';
/** 0 = geen, 1 = licht, 2 = matig, 3 = erg */
export type Severity = 0 | 1 | 2 | 3;
export type SymptomKey = 'buikpijn' | 'hoofdpijn' | 'vermoeidheid';

export interface DayLog {
  /** Aanwezig = menstruatiedag. */
  flow?: Flow;
  /** Zelf gemarkeerde ovulatie. */
  ovulation?: boolean;
  lh?: LhTest;
  /** Basale temperatuur in °C. */
  bbt?: number;
  mucus?: Mucus;
  symptoms?: Partial<Record<SymptomKey, Severity>>;
  mood?: string[];
  energy?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export type Logs = Record<DayKey, DayLog>;

export interface Profile {
  name: string;
  birthDate: DayKey;
  /** 'HH:MM' lokale tijd op de geboorteplaats. */
  birthTime: string;
  birthPlace: string;
  /** IANA-tijdzone van de geboorteplaats (voor zomertijd/historische regels). */
  birthTz: string;
  /** Optioneel: fasehoek handmatig invullen (bv. uit Astrodienst), in graden. */
  phaseOverride?: number;
  cycleLength: number;
  periodLength: number;
}

export interface NotificationSettings {
  enabled: boolean;
  menstruation: boolean;
  moonFertile: boolean;
  bioFertile: boolean;
  /** 'HH:MM' lokale tijd van de melding. */
  time: string;
}

export interface PinData {
  salt: string;
  hash: string;
  iterations: number;
}

export type ThemeSetting = 'auto' | 'light' | 'dark';

export interface Settings {
  theme: ThemeSetting;
  /** Tijdzone voor dagindeling van de kalender. */
  tz: string;
  windowMode: WindowMode;
  notifications: NotificationSettings;
  pin?: PinData;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  logs: Logs;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  tz: 'Europe/Amsterdam',
  windowMode: 'before24',
  notifications: { enabled: false, menstruation: true, moonFertile: true, bioFertile: true, time: '09:00' },
};

export function emptyData(): AppData {
  return { version: 1, profile: null, logs: {}, settings: structuredClone(DEFAULT_SETTINGS) };
}

export const DISCLAIMER =
  'De maanfase-methode (Jonas) is niet wetenschappelijk bewezen. Deze app is géén anticonceptiemiddel en geen medisch hulpmiddel. Neem bij twijfel of klachten contact op met je huisarts.';
