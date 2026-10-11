import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Eenvoudige localStorage-nabootsing, zodat de store zich net als in de browser gedraagt. */
function installLocalStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  });
  return map;
}

const profile = { name: 'Z', birthDate: '2003-01-14', birthTime: '21:12', birthPlace: '', birthTz: 'Europe/Amsterdam', cycleLength: 28, periodLength: 5 };

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('opslag in localStorage', () => {
  it('leest bij het opstarten eerder opgeslagen gegevens terug (regressie: constanten voor de init)', async () => {
    installLocalStorage({
      'maanfase.v1': JSON.stringify({
        version: 1,
        profile,
        logs: { '2026-10-01': { flow: 'zwaar', symptoms: { buikpijn: 2 }, mood: ['Kalm'], bbt: 36.55 } },
        settings: { theme: 'dark', tz: 'Europe/Amsterdam', windowMode: 'centered24', notifications: { enabled: false, menstruation: true, moonFertile: true, bioFertile: true, time: '09:00' } },
      }),
    });
    const store = await import('../src/lib/store');
    const d = store.getData();
    expect(d.profile?.birthDate).toBe('2003-01-14');
    expect(d.logs['2026-10-01']).toEqual({ flow: 'zwaar', symptoms: { buikpijn: 2 }, mood: ['Kalm'], bbt: 36.55 });
    expect(d.settings.theme).toBe('dark');
    expect(d.settings.windowMode).toBe('centered24');
  });

  it('bewaart wijzigingen en verwijdert lege dagen', async () => {
    const map = installLocalStorage();
    const store = await import('../src/lib/store');
    store.saveProfile(profile);
    store.setLog('2026-10-02', { flow: 'normaal' });
    store.setLog('2026-10-03', { note: 'hallo' });
    store.setLog('2026-10-03', {}); // leeg -> weg
    const saved = JSON.parse(map.get('maanfase.v1')!);
    expect(saved.profile.birthDate).toBe('2003-01-14');
    expect(Object.keys(saved.logs)).toEqual(['2026-10-02']);
  });

  it('start leeg bij beschadigde opslag zonder te crashen', async () => {
    installLocalStorage({ 'maanfase.v1': '{ kapot' });
    const store = await import('../src/lib/store');
    expect(store.getData().profile).toBeNull();
  });

  it('behoudt de pincode na een herstart maar exporteert hem nooit', async () => {
    installLocalStorage();
    const store = await import('../src/lib/store');
    store.saveSettings({ pin: { salt: 'aa', hash: 'bb', iterations: 1 } });
    expect(store.exportJson()).not.toContain('"hash"');
    vi.resetModules();
    const again = await import('../src/lib/store');
    expect(again.getData().settings.pin?.hash).toBe('bb');
  });
});
