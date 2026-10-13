import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyMeetbon } from '../packages/shared/src/meetbon';
import { hasMeetbonChanges } from '../packages/shared/src/meetbonMerge';

test('save status ignores revisions, empty defaults and JSON object key order', () => {
  const saved = { ...emptyMeetbon(), fields: { name: 'D01', street: 'Test' }, revision: 'saved' };
  const shown = { ...saved, fields: { street: 'Test', name: 'D01', city: '' }, checks: { g1c0: false }, revision: 'new' };
  assert.equal(hasMeetbonChanges(shown, saved), false);
});

test('save status detects changes to fields, checks and panes and clears after save or undo', () => {
  const saved = emptyMeetbon();
  for (const changed of [
    { ...saved, fields: { name: 'D01' } },
    { ...saved, checks: { g1c0: true } },
    { ...saved, lines: [{ quantity: 1, width: 875, height: 484, glassType: 'HR++', notes: '' }] },
  ]) {
    assert.equal(hasMeetbonChanges(changed, saved), true);
    assert.equal(hasMeetbonChanges(changed, structuredClone(changed)), false);
  }
  assert.equal(hasMeetbonChanges({ ...saved, fields: { name: '' } }, saved), false);
});
