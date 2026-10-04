import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyMeetbon, isMeetbon } from '../packages/shared/src/meetbon';
test('meetbon validates drafts and rejects unknown fields, invalid dimensions and excessive rows', () => {
  assert.equal(isMeetbon(emptyMeetbon()), true);
  const line = { quantity: 1, width: 875, height: 484, glassType: 'HR++', notes: '' };
  assert.equal(isMeetbon({ fields: { name: 'Klant' }, checks: { g1c0: false }, lines: [line] }), true);
  for (const bad of [null, { ...emptyMeetbon(), fields: { unknown: 'x' } }, { ...emptyMeetbon(), checks: { g1c0: 'yes' } }, { ...emptyMeetbon(), lines: [{ ...line, width: -1 }] }, { ...emptyMeetbon(), lines: [{ ...line, quantity: 1.5 }] }, { ...emptyMeetbon(), lines: Array(201).fill(line) }]) assert.equal(isMeetbon(bad), false);
});

 test('meetbon rejects text that PostgreSQL jsonb cannot store but accepts valid Unicode', () => {
  for (const text of ['\u0000', '\ud800', '\udc00', 'a\udc00']) {
    assert.equal(isMeetbon({ fields: { name: text }, checks: {}, lines: [] }), false);
    assert.equal(isMeetbon({ fields: {}, checks: {}, lines: [{ quantity: 1, width: 1, height: 1, glassType: text, notes: '' }] }), false);
  }
  assert.equal(isMeetbon({ fields: { name: 'é 🪟 漢字' }, checks: {}, lines: [] }), true);
});
