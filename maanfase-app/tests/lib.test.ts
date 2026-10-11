import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDayLong, mondayIndex } from '../src/lib/dates';
import { analyze } from '../src/lib/cycle';
import { compareOvulationWithMoon } from '../src/lib/insights';
import { buildMoonTimeline, findFertileMoments, markFertileDays, moonPhaseAngle, windowAround } from '../src/lib/moon';
import { buildReminders, dueReminders } from '../src/lib/reminders';
import { exportJson, importJson, sanitize } from '../src/lib/store';
import { dayKeyInTz, dayStartUtc, formatTimeInTz, offsetLabel, zonedToUtc } from '../src/lib/tz';
import { DEFAULT_SETTINGS, emptyData, type Logs, type Profile } from '../src/lib/types';
import { signsForMonth, SIGNS, sunSignIndex } from '../src/lib/zodiac';

const tz = 'Europe/Amsterdam';

describe('datums en tijdzones', () => {
  it('rekent dagen en weekdagen (maandag eerst)', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-11', '2026-10-29')).toBe(18);
    expect(mondayIndex('2026-10-11')).toBe(6); // zondag
    expect(formatDayLong('2003-01-14')).toMatch(/dinsdag 14 januari 2003/);
  });

  it('zet Amsterdamse wandtijd om naar UTC met zomer- en wintertijd', () => {
    expect(zonedToUtc(2003, 1, 14, 21, 12, tz).toISOString()).toBe('2003-01-14T20:12:00.000Z'); // UTC+1
    expect(zonedToUtc(2026, 7, 1, 12, 0, tz).toISOString()).toBe('2026-07-01T10:00:00.000Z'); // UTC+2
    expect(offsetLabel(new Date('2003-01-14T20:12:00Z'), tz)).toBe('UTC+1');
    expect(offsetLabel(new Date('2026-07-01T10:00:00Z'), tz)).toBe('UTC+2');
  });

  it('kent andere tijdzones, ook met halve uren', () => {
    expect(zonedToUtc(2000, 6, 1, 12, 0, 'Asia/Kolkata').toISOString()).toBe('2000-06-01T06:30:00.000Z');
    expect(zonedToUtc(2003, 1, 14, 21, 12, 'America/Paramaribo').toISOString()).toBe('2003-01-15T00:12:00.000Z');
  });

  it('bepaalt de kalenderdag in een tijdzone (rond middernacht)', () => {
    const t = new Date('2026-10-22T22:30:00Z'); // 23 okt 00:30 in Amsterdam (UTC+2)
    expect(dayKeyInTz(t, tz)).toBe('2026-10-23');
    expect(dayKeyInTz(t, 'UTC')).toBe('2026-10-22');
    expect(formatTimeInTz(t, tz)).toBe('00:30');
  });

  it('dag heeft 23 uur bij overgang naar zomertijd (28 maart 2027)', () => {
    const a = dayStartUtc('2027-03-28', tz).getTime();
    const b = dayStartUtc('2027-03-29', tz).getTime();
    expect((b - a) / 3_600_000).toBe(23);
  });
});

describe('maanfase', () => {
  const birth = zonedToUtc(2003, 1, 14, 21, 12, tz);
  const phase = moonPhaseAngle(birth);

  it('vindt elke ±29,5 dagen opnieuw dezelfde fasehoek (en de hoek klopt op dat moment)', () => {
    const f = findFertileMoments(phase, new Date('2026-10-01T00:00:00Z'), new Date('2027-09-30T00:00:00Z'));
    expect(f.length).toBe(12);
    for (const x of f) expect(Math.abs(moonPhaseAngle(x.moment) - phase)).toBeLessThan(0.001);
    for (let i = 1; i < f.length; i++) {
      const gap = (f[i].moment.getTime() - f[i - 1].moment.getTime()) / 86_400_000;
      expect(gap).toBeGreaterThan(29.0);
      expect(gap).toBeLessThan(30.0);
    }
  });

  it('venster "24 uur ervoor" vs "12 uur voor en na"', () => {
    const m = new Date('2026-10-22T19:21:09Z');
    expect(windowAround(m, 'before24').start.toISOString()).toBe('2026-10-21T19:21:09.000Z');
    expect(windowAround(m, 'before24').end.toISOString()).toBe(m.toISOString());
    expect(windowAround(m, 'centered24').start.toISOString()).toBe('2026-10-22T07:21:09.000Z');
    expect(windowAround(m, 'centered24').end.toISOString()).toBe('2026-10-23T07:21:09.000Z');
  });

  it('markeert de dagen in Europe/Amsterdam: moment 22 okt 21:21 lokaal', () => {
    const m = new Date('2026-10-22T19:21:09Z'); // 21:21 CEST
    const before = markFertileDays([windowAround(m, 'before24')], tz);
    expect([...before.entries()]).toEqual([
      ['2026-10-21', 'window'],
      ['2026-10-22', 'peak'],
    ]);
    const centered = markFertileDays([windowAround(m, 'centered24')], tz);
    expect([...centered.entries()]).toEqual([
      ['2026-10-22', 'peak'],
      ['2026-10-23', 'window'],
    ]);
  });

  it('een venster dat exact om middernacht eindigt raakt de volgende dag niet', () => {
    // moment = 23 okt 00:00 lokaal, venster 22 okt 00:00 - 23 okt 00:00 = alleen 22 okt
    const days = markFertileDays([windowAround(new Date('2026-10-22T22:00:00Z'), 'before24')], tz);
    expect([...days.keys()]).toEqual(['2026-10-22']);
  });

  it('bouwt een tijdlijn voor drie jaar snel genoeg', () => {
    const t0 = performance.now();
    const tl = buildMoonTimeline(phase, new Date('2024-01-01T00:00:00Z'), new Date('2029-12-31T00:00:00Z'), tz);
    expect(tl.fertile.length).toBeGreaterThan(70);
    expect(tl.newMoonDays.size).toBeGreaterThan(70);
    expect(performance.now() - t0).toBeLessThan(2500);
  });
});

describe('dierenriem', () => {
  it('geeft het zonneteken van 23 okt 2026 (Schorpioen vanaf ~23 okt)', () => {
    expect(SIGNS[sunSignIndex(new Date('2026-10-22T12:00:00Z'))].name).toBe('Weegschaal');
    expect(SIGNS[sunSignIndex(new Date('2026-10-24T12:00:00Z'))].name).toBe('Schorpioen');
    const s = signsForMonth(2026, 10, tz);
    expect(SIGNS[s.start].name).toBe('Weegschaal');
    expect(SIGNS[s.change!.signIndex].name).toBe('Schorpioen');
    expect(s.change!.day).toBe('2026-10-23');
  });
});

describe('inzicht: ovulatie vs maanfase', () => {
  it('telt hoe vaak de ovulatie op een maanfase-dag valt', () => {
    const birth = zonedToUtc(2003, 1, 14, 21, 12, tz);
    const phase = moonPhaseAngle(birth);
    const moon = buildMoonTimeline(phase, new Date('2026-08-01T00:00:00Z'), new Date('2027-03-01T00:00:00Z'), tz);
    const peaks = moon.fertile.map((f) => dayKeyInTz(f.moment, tz));
    const profile = { cycleLength: 28, periodLength: 5 };
    const logs: Logs = {};
    // cyclus 1: ovulatie precies op de maanfase-dag; cyclus 2: 6 dagen ernaast
    const peak1 = peaks.find((p) => p > '2026-09-01')!;
    const start1 = addDays(peak1, -13);
    logs[start1] = { flow: 'normaal' };
    logs[peak1] = { ovulation: true };
    const start2 = addDays(start1, 28);
    logs[start2] = { flow: 'normaal' };
    const peak2 = peaks.find((p) => p > start2)!;
    logs[addDays(peak2, 6)] = { ovulation: true };
    logs[addDays(start2, 28)] = { flow: 'normaal' };
    const a = analyze(logs, profile, addDays(start2, 40));
    const cmp = compareOvulationWithMoon(a.cycles, moon);
    expect(cmp.n).toBe(2);
    expect(cmp.onDay).toBe(1);
    expect(cmp.withinOne).toBe(1);
    expect(cmp.rows[0].offsetDays).toBe(0);
    expect(Math.abs(cmp.rows[1].offsetDays!)).toBeGreaterThanOrEqual(4);
    expect(cmp.chanceOnDay).toBeGreaterThan(0.05);
    expect(cmp.chanceOnDay).toBeLessThan(0.12);
  });
});

describe('meldingen', () => {
  const profile = { cycleLength: 28, periodLength: 5 };
  const logs: Logs = { '2026-10-01': { flow: 'normaal' } };
  const analysis = analyze(logs, profile, '2026-10-11');
  const phase = moonPhaseAngle(zonedToUtc(2003, 1, 14, 21, 12, tz));
  const moon = buildMoonTimeline(phase, new Date('2026-09-20T00:00:00Z'), new Date('2027-02-01T00:00:00Z'), tz, 'before24');
  const settings = { ...DEFAULT_SETTINGS.notifications, enabled: true };
  const now = new Date('2026-10-11T08:00:00Z');

  it('plant niets als meldingen uit staan', () => {
    expect(buildReminders({ analysis, moon, settings: { ...settings, enabled: false }, tz, now })).toHaveLength(0);
  });

  it('plant menstruatie-, vruchtbaar- en maanfase-meldingen op de ingestelde tijd', () => {
    const r = buildReminders({ analysis, moon, settings, tz, now });
    const m = r.find((x) => x.id === 'menstruatie:2026-10-29')!;
    expect(m).toBeDefined();
    // 2 dagen vóór 29 okt = 27 okt 09:00 Amsterdam = 08:00 UTC (CET niet meer: 25 okt is wintertijd -> UTC+1 => 08:00Z)
    expect(new Date(m.at).toISOString()).toBe('2026-10-27T08:00:00.000Z');
    expect(r.some((x) => x.id.startsWith('maanfase:'))).toBe(true);
    expect(r.some((x) => x.id.startsWith('vruchtbaar:'))).toBe(true);
    expect(r.every((x, i) => i === 0 || r[i - 1].at <= x.at)).toBe(true);
  });

  it('toont alleen verstreken meldingen die nog niet getoond zijn', () => {
    const r = buildReminders({ analysis, moon, settings, tz, now });
    const t = new Date('2026-10-27T08:30:00Z').getTime();
    const due = dueReminders(r, new Set(), t);
    expect(due.map((x) => x.id)).toContain('menstruatie:2026-10-29');
    expect(dueReminders(r, new Set(['menstruatie:2026-10-29']), t).map((x) => x.id)).not.toContain('menstruatie:2026-10-29');
  });
});

describe('back-up en import', () => {
  const profile: Profile = { name: 'Test', birthDate: '2003-01-14', birthTime: '21:12', birthPlace: 'Amsterdam', birthTz: tz, cycleLength: 29, periodLength: 4 };

  it('exporteert zonder pincode en importeert hetzelfde terug', () => {
    const data = emptyData();
    data.profile = profile;
    data.logs['2026-10-01'] = { flow: 'zwaar', symptoms: { buikpijn: 2 }, mood: ['blij'], bbt: 36.5, note: 'hallo' };
    data.settings.pin = { salt: 'aa', hash: 'bb', iterations: 1 };
    const json = exportJson(data);
    expect(json).not.toContain('"hash"');
    const back = importJson(json);
    expect(back.profile).toEqual({ ...profile, phaseOverride: undefined });
    expect(back.logs['2026-10-01']).toEqual(data.logs['2026-10-01']);
    expect(back.settings.pin).toBeUndefined();
  });

  it('negeert ongeldige invoer in plaats van te crashen', () => {
    const d = sanitize(
      { profile: { birthDate: 'kapot' }, logs: { '2026-13-45': { flow: 'zwaar' }, '2026-10-02': { flow: 'raar', bbt: 99, symptoms: { buikpijn: 9 }, note: '  ' }, '2026-10-03': { bbt: 36.7 } } },
      false,
    );
    expect(d.profile).toBeNull();
    expect(Object.keys(d.logs)).toEqual(['2026-10-03']);
    expect(() => sanitize('onzin', false)).toThrow();
    expect(() => importJson('{ kapot')).toThrow();
  });
});
