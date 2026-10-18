import test from 'node:test';
import assert from 'node:assert/strict';
import { dictationValue } from '../apps/mobile/src/utils/meetbonDictation';

test('meetbon dictation preserves text, supports Dutch dimensions and whole quantities', () => {
  assert.equal(dictationValue('  Klant bij de voordeur bellen. ', 'text'), 'Klant bij de voordeur bellen.');
  assert.equal(dictationValue('875 millimeter', 'dimension'), '875');
  assert.equal(dictationValue('1.230 mm', 'dimension'), '1230');
  assert.equal(dictationValue('1 230,5 millimeter', 'dimension'), '1230.5');
  assert.equal(dictationValue('875,5', 'dimension'), '875.5');
  assert.equal(dictationValue('twee', 'quantity'), '2');
});
test('dictation refuses ambiguous multi-value speech and invalid quantities instead of corrupting fields', () => {
  for (const value of ['875 bij 484', '8 75', '-5', '0', 'Infinity', '1e3', 'twee meter', '875 centimeter']) {
    assert.throws(() => dictationValue(value, 'dimension'), undefined, value);
  }
  assert.throws(() => dictationValue('1,5', 'quantity'), /heel aantal/);
  assert.throws(() => dictationValue(' ', 'text'));
  assert.throws(() => dictationValue('a'.repeat(2001), 'text'));
});
