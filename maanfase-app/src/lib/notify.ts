import { idbGet, idbSet } from './idb';
import { type Reminder, dueReminders } from './reminders';

export const SCHEDULE_KEY = 'reminders';
export const SHOWN_KEY = 'reminders-shown';

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

async function show(r: Reminder) {
  const options: NotificationOptions = { body: r.body, tag: r.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(r.title, options);
  } catch {
    new Notification(r.title, options);
  }
}

/** Bewaart het meldingsschema zodat de service worker het ook op de achtergrond kan gebruiken. */
export async function syncSchedule(reminders: Reminder[]) {
  await idbSet(SCHEDULE_KEY, reminders);
  try {
    const reg = await navigator.serviceWorker.ready;
    const ps = (reg as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void> } }).periodicSync;
    if (ps && (await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })).state === 'granted') {
      await ps.register('maanfase-reminders', { minInterval: 6 * 3600 * 1000 });
    }
  } catch {
    /* periodic sync niet beschikbaar: meldingen verschijnen dan wanneer de app geopend wordt */
  }
}

/** Toont verstreken, nog niet getoonde meldingen. Geeft het aantal getoonde meldingen terug. */
export async function showDueReminders(reminders: Reminder[], now = Date.now()): Promise<number> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0;
  const shown = new Set((await idbGet<string[]>(SHOWN_KEY)) ?? []);
  const due = dueReminders(reminders, shown, now);
  for (const r of due) {
    await show(r);
    shown.add(r.id);
  }
  if (due.length) await idbSet(SHOWN_KEY, Array.from(shown).slice(-300));
  return due.length;
}
