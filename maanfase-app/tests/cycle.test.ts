import { describe, expect, it } from 'vitest';
import { addDays } from '../src/lib/dates';
import { analyze, nextEvents, ovFromTemperature, periodRuns } from '../src/lib/cycle';
import type { Logs } from '../src/lib/types';

const profile = { cycleLength: 28, periodLength: 5 };

function period(logs: Logs, start: string, len: number) {
  for (let i = 0; i < len; i++) logs[addDays(start, i)] = { ...(logs[addDays(start, i)] ?? {}), flow: 'normaal' };
}

describe('cyclus-analyse', () => {
  it('geeft geen voorspelling zonder gegevens', () => {
    const a = analyze({}, profile, '2026-10-11');
    expect(a.predicted).toHaveLength(0);
    expect(a.cycleDay).toBeUndefined();
    expect(a.stats.usingDefaults).toBe(true);
  });

  it('voorspelt met de ingestelde standaard na één menstruatie', () => {
    const logs: Logs = {};
    period(logs, '2026-10-01', 5);
    const a = analyze(logs, profile, '2026-10-11');
    expect(a.cycleDay).toBe(11);
    expect(a.nextPeriod).toBe('2026-10-29'); // 1 okt + 28
    const next = nextEvents(a, '2026-10-11');
    expect(next.ovulation).toBe('2026-10-15'); // 29 okt - 14
    expect(next.fertileStart).toBe('2026-10-10');
    expect(next.fertileEnd).toBe('2026-10-16');
  });

  it('leert de cycluslengte van eigen gegevens en wordt nauwkeuriger', () => {
    const logs: Logs = {};
    // vier cycli van 30 dagen
    for (const s of ['2026-05-01', '2026-05-31', '2026-06-30', '2026-07-30']) period(logs, s, 4);
    const a = analyze(logs, profile, '2026-08-05');
    expect(a.stats.nCycles).toBe(3);
    expect(a.stats.avgCycle).toBeCloseTo(30, 5);
    expect(a.stats.avgPeriod).toBeCloseTo(4, 5);
    expect(a.stats.regularity).toBe('regelmatig');
    expect(a.nextPeriod).toBe('2026-08-29');
    // volgende cycli stappen ook 30 dagen
    expect(a.predicted[1].periodStart).toBe('2026-08-29');
    expect(a.predicted[2].periodStart).toBe('2026-09-28');
  });

  it('gebruikt een bekende ovulatie om de volgende menstruatie te verfijnen', () => {
    const logs: Logs = {};
    period(logs, '2026-10-01', 5);
    logs['2026-10-17'] = { ovulation: true };
    const a = analyze(logs, profile, '2026-10-20');
    expect(a.cycles[0].ovulation).toEqual({ day: '2026-10-17', source: 'zelf' });
    expect(a.nextPeriod).toBe('2026-10-31'); // 17 okt + 14
    expect(a.predicted[0].ovulationKnown).toBe(true);
  });

  it('schat ovulatie uit een positieve ovulatietest (dag erna)', () => {
    const logs: Logs = {};
    period(logs, '2026-10-01', 5);
    logs['2026-10-13'] = { lh: 'negatief' };
    logs['2026-10-14'] = { lh: 'positief' };
    logs['2026-10-15'] = { lh: 'positief' };
    const a = analyze(logs, profile, '2026-10-20');
    expect(a.cycles[0].ovulation).toEqual({ day: '2026-10-15', source: 'lh' });
  });

  it('detecteert een temperatuurverschuiving (3 boven 6)', () => {
    const base = [36.3, 36.4, 36.3, 36.35, 36.3, 36.4];
    const temps = [...base, 36.6, 36.65, 36.7, 36.7].map((t, i) => ({ day: addDays('2026-10-05', i), t }));
    // eerste verhoogde dag = index 6 (11 okt) -> ovulatie 10 okt
    expect(ovFromTemperature(temps)).toBe('2026-10-10');
    expect(ovFromTemperature(temps.slice(0, 8))).toBeUndefined();
  });

  it('berekent luteale fase en markeert een te late menstruatie', () => {
    const logs: Logs = {};
    period(logs, '2026-08-01', 5);
    logs['2026-08-15'] = { ovulation: true };
    period(logs, '2026-08-29', 5); // luteaal = 14
    const a = analyze(logs, profile, '2026-09-20');
    expect(a.cycles[0].luteal).toBe(14);
    expect(a.cycles[0].length).toBe(28);
    expect(a.overdueDays).toBe(0);
    expect(a.nextPeriod).toBe('2026-09-26');
    const late = analyze(logs, profile, '2026-10-01');
    expect(late.overdueDays).toBe(5);
  });

  it('markeert werkelijke boven voorspelde dagen', () => {
    const logs: Logs = {};
    period(logs, '2026-10-01', 3);
    const a = analyze(logs, profile, '2026-10-11');
    expect(a.marks.get('2026-10-02')?.period).toBe('actual');
    expect(a.marks.get('2026-10-29')?.period).toBe('predicted');
    expect(a.marks.get('2026-10-15')?.ovulation).toBe('predicted');
  });

  it('groepeert aaneengesloten menstruatiedagen', () => {
    const logs: Logs = {};
    period(logs, '2026-10-01', 3);
    period(logs, '2026-10-30', 2);
    expect(periodRuns(logs).map((p) => [p.start, p.length])).toEqual([['2026-10-01', 3], ['2026-10-30', 2]]);
  });
});
