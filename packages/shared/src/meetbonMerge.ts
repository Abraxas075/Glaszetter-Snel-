import { MEETBON_SECTIONS, type Meetbon } from './meetbon';
export interface MeetbonConflict { key: string; label: string; own: unknown; latest: unknown; }
export interface MeetbonComparison { merged: Meetbon; latest: Meetbon; conflicts: MeetbonConflict[]; }
const canonical = (v: unknown): string => JSON.stringify(v, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, value[k]])) : value);
export function compareMeetbons(base: Meetbon, own: Meetbon, latest: Meetbon): MeetbonComparison {
  const conflicts: MeetbonConflict[] = [];
  const choose = (key: string, label: string, b: unknown, o: unknown, n: unknown) => {
    if (canonical(o) === canonical(b)) return n;
    if (canonical(n) === canonical(b) || canonical(o) === canonical(n)) return o;
    conflicts.push({ key, label, own: o, latest: n }); return o;
  };
  const merged: Meetbon = { fields: {}, checks: {}, lines: [], revision: latest.revision };
  for (const s of MEETBON_SECTIONS) {
    for (const f of s.fields) merged.fields[f.key] = choose('fields.' + f.key, f.label, base.fields[f.key] ?? '', own.fields[f.key] ?? '', latest.fields[f.key] ?? '') as string;
    for (const c of s.checks) merged.checks[c.key] = choose('checks.' + c.key, c.label, base.checks[c.key] ?? false, own.checks[c.key] ?? false, latest.checks[c.key] ?? false) as boolean;
  }
  // Rows have no stable IDs yet: never guess whether an index denotes the same pane.
  merged.lines = choose('lines', 'Ruiten (alle regels)', base.lines, own.lines, latest.lines) as Meetbon['lines'];
  return { merged, latest, conflicts };
}
export function resolveMeetbonComparison(comparison: MeetbonComparison, choices: Record<string, 'own' | 'latest'>): Meetbon {
  const merged: Meetbon = { ...comparison.merged, fields: { ...comparison.merged.fields }, checks: { ...comparison.merged.checks } };
  for (const conflict of comparison.conflicts) {
    if (!choices[conflict.key]) throw new Error('Kies voor ieder verschil welke invoer je wilt behouden.');
    const value = choices[conflict.key] === 'own' ? conflict.own : conflict.latest;
    if (conflict.key === 'lines') merged.lines = value as Meetbon['lines'];
    else if (conflict.key.startsWith('fields.')) merged.fields[conflict.key.slice(7)] = value as string;
    else merged.checks[conflict.key.slice(7)] = value as boolean;
  }
  return merged;
}
