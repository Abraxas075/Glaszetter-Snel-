/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { idbGet, idbSet } from './lib/idb';
import { type Reminder, dueReminders } from './lib/reminders';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

async function showDue() {
  const schedule = (await idbGet<Reminder[]>('reminders')) ?? [];
  const shown = new Set((await idbGet<string[]>('reminders-shown')) ?? []);
  const due = dueReminders(schedule, shown, Date.now());
  for (const r of due) {
    await self.registration.showNotification(r.title, { body: r.body, tag: r.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
    shown.add(r.id);
  }
  if (due.length) await idbSet('reminders-shown', Array.from(shown).slice(-300));
}

// Chrome (geïnstalleerde PWA op Android/desktop) kan af en toe op de achtergrond wakker worden
self.addEventListener('periodicsync', (event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === 'maanfase-reminders') e.waitUntil(showDue());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list[0];
      return c ? c.focus() : self.clients.openWindow('./');
    }),
  );
});
