import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareMeetbons, resolveMeetbonComparison } from '../packages/shared/src/meetbonMerge';
import { emptyMeetbon } from '../packages/shared/src/meetbon';
test('three-way comparison combines separate changes and preserves latest revision', () => {
  const base = { ...emptyMeetbon(), revision: 'first' };
  const own = { ...base, fields: { name: 'Eigen naam' } };
  const latest = { ...base, checks: { g1c0: true }, fields: { city: 'Zaandam' }, revision: 'next' };
  const result = compareMeetbons(base, own, latest);
  assert.deepEqual(result.conflicts, []);
  const merged = resolveMeetbonComparison(result, {});
  assert.equal(merged.fields.name, 'Eigen naam');
  assert.equal(merged.fields.city, 'Zaandam');
  assert.equal(merged.checks.g1c0, true);
  assert.equal(merged.revision, 'next');
  assert.equal(own.fields.name, 'Eigen naam');
});
test('same-field conflicts require explicit choices, including clearing a field', () => {
  const base = { ...emptyMeetbon(), fields: { name: 'Klant' } };
  const own = { ...base, fields: { name: '' } };
  const latest = { ...base, fields: { name: 'Ander' }, revision: 'new' };
  const result = compareMeetbons(base, own, latest);
  assert.equal(result.conflicts.length, 1);
  assert.throws(() => resolveMeetbonComparison(result, {}));
  assert.equal(resolveMeetbonComparison(result, { 'fields.name': 'own' }).fields.name, '');
  assert.equal(resolveMeetbonComparison(result, { 'fields.name': 'latest' }).fields.name, 'Ander');
});
test('jsonb key order is irrelevant; diverging pane lists require whole-list choice', () => {
  const line = { quantity: 1, width: 875, height: 484, glassType: 'HR++', notes: '' };
  const base = { ...emptyMeetbon(), lines: [line] };
  const reordered = { ...base, lines: [{ notes: '', glassType: 'HR++', height: 484, width: 875, quantity: 1 }] };
  assert.equal(compareMeetbons(base, reordered, base).conflicts.length, 0);
  const own = { ...base, lines: [{ ...line, width: 900 }] };
  const latest = { ...base, lines: [] };
  const comparison = compareMeetbons(base, own, latest);
  assert.equal(comparison.conflicts[0].key, 'lines');
  assert.deepEqual(resolveMeetbonComparison(comparison, { lines: 'own' }).lines, own.lines);
  assert.deepEqual(resolveMeetbonComparison(comparison, { lines: 'latest' }).lines, []);
});
