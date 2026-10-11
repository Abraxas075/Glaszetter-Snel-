import { describe, expect, it } from 'vitest';
import { endPeriod, startPeriod } from '../src/lib/periods';
import type { Logs } from '../src/lib/types';

const apply = (logs: Logs, patches: Record<string, unknown>): Logs => {
  const out = { ...logs };
  for (const [d, l] of Object.entries(patches)) {
    const log = l as Logs[string] | null;
    if (!log || Object.keys(log).length === 0) delete out[d];
    else out[d] = log;
  }
  return out;
};

describe('menstruatie start en einde', () => {
  it('start vandaag markeert alleen vandaag', () => {
    const p = startPeriod({}, '2026-10-11', '2026-10-11', 5);
    expect(Object.keys(p)).toEqual(['2026-10-11']);
  });

  it('start in het verleden vult door tot vandaag, maximaal de gebruikelijke duur', () => {
    expect(Object.keys(startPeriod({}, '2026-10-09', '2026-10-11', 5))).toEqual(['2026-10-09', '2026-10-10', '2026-10-11']);
    expect(Object.keys(startPeriod({}, '2026-10-01', '2026-10-11', 5))).toHaveLength(5);
  });

  it('start behoudt een al ingevulde hevigheid en overschrijft niets', () => {
    const logs: Logs = { '2026-10-10': { flow: 'zwaar', note: 'x' } };
    const p = startPeriod(logs, '2026-10-09', '2026-10-11', 5);
    expect(p['2026-10-10']).toBeUndefined(); // al ingevuld: onaangeroerd
    expect(Object.keys(p)).toEqual(['2026-10-09', '2026-10-11']);
  });

  it('einde vult de dagen vanaf het begin en maakt latere dagen vrij', () => {
    let logs: Logs = { '2026-10-01': { flow: 'normaal' }, '2026-10-02': { flow: 'zwaar' }, '2026-10-05': { flow: 'licht' }, '2026-10-06': { flow: 'licht' } };
    logs = apply(logs, endPeriod(logs, '2026-10-03'));
    expect(Object.keys(logs).sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']);
    // 5 en 6 oktober hangen niet aan 1-3 okt (4 okt mist), dus blijven staan
    logs = { '2026-10-01': { flow: 'normaal' }, '2026-10-02': { flow: 'normaal' }, '2026-10-03': { flow: 'normaal' }, '2026-10-04': { flow: 'normaal' }, '2026-10-05': { flow: 'licht', note: 'a' } };
    logs = apply(logs, endPeriod(logs, '2026-10-03'));
    expect(logs['2026-10-04']).toBeUndefined();
    expect(logs['2026-10-05']).toEqual({ note: 'a' }); // menstruatie weggehaald, notitie blijft
  });

  it('einde zonder menstruatie in de buurt doet niets', () => {
    expect(endPeriod({}, '2026-10-11')).toEqual({});
  });
});
