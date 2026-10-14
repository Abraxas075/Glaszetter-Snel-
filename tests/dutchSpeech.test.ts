import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendSpeech, createDutchSpeech, type Recognition, type SpeechState } from '../apps/web/src/lib/dutchSpeech';
class FakeRecognition implements Recognition {
  static last: FakeRecognition; static starts = 0;
  lang = ''; interimResults = false; continuous = true; maxAlternatives = 0;
  onresult: Recognition['onresult'] = null; onerror: Recognition['onerror'] = null; onend: Recognition['onend'] = null;
  aborted = false; stopped = false;
  constructor() { FakeRecognition.last = this; }
  start() { FakeRecognition.starts++; } stop() { this.stopped = true; } abort() { this.aborted = true; }
}
test('Dutch recognition prevents parallel starts and replaces interim text instead of duplicating it', () => {
  const states: SpeechState[] = []; const controller = createDutchSpeech(FakeRecognition, state => states.push(state));
  controller.start(); const recognition = FakeRecognition.last; const starts = FakeRecognition.starts; controller.start();
  assert.equal(FakeRecognition.starts, starts); assert.equal(recognition.lang, 'nl-NL'); assert.equal(recognition.interimResults, true); assert.equal(recognition.continuous, false);
  recognition.onresult!({ results: [[{ transcript: 'Gebroken' }]] });
  recognition.onresult!({ results: [[{ transcript: 'Gebroken ruit' }], [{ transcript: 'veiligstellen' }]] });
  assert.equal(states.at(-1)!.transcript, 'Gebroken ruit veiligstellen');
  controller.stop(); assert.equal(recognition.stopped, true);
  recognition.onend!(); assert.equal(states.at(-1)!.isListening, false); assert.equal(states.at(-1)!.transcript, 'Gebroken ruit veiligstellen');
  controller.reset(); assert.equal(states.at(-1)!.transcript, ''); controller.dispose();
});
test('permission denial has a Dutch error and leaves no active recognizer', () => {
  const states: SpeechState[] = []; const controller = createDutchSpeech(FakeRecognition, state => states.push(state));
  controller.start(); const recognition = FakeRecognition.last;
  recognition.onerror!({ error: 'not-allowed' });
  assert.match(states.at(-1)!.error, /Microfoontoegang is geweigerd/); assert.equal(states.at(-1)!.isListening, false); assert.equal(recognition.aborted, true);
  controller.start(); assert.notEqual(FakeRecognition.last, recognition); controller.dispose();
});
test('closing aborts recording and ignores late recognition events', () => {
  const states: SpeechState[] = []; const controller = createDutchSpeech(FakeRecognition, state => states.push(state));
  controller.start(); const recognition = FakeRecognition.last; const callback = recognition.onresult!; const count = states.length;
  controller.dispose(); assert.equal(recognition.aborted, true); assert.equal(recognition.onresult, null);
  callback({ results: [[{ transcript: 'Laat resultaat' }]] }); controller.start(); assert.equal(states.length, count);
});
test('failed starts report an error and cleanup the recognizer', () => {
  class Failing extends FakeRecognition { start() { throw new Error('disabled'); } }
  const states: SpeechState[] = []; const controller = createDutchSpeech(Failing, state => states.push(state));
  controller.start(); assert.equal(states.at(-1)!.isListening, false); assert.match(states.at(-1)!.error, /kon niet starten/); assert.equal(FakeRecognition.last.aborted, true); controller.dispose();
});
test('reviewed speech preserves existing description and refuses truncation beyond 2000 characters', () => {
  assert.equal(appendSpeech('Bestaande omschrijving', ' Nieuwe spraak '), 'Bestaande omschrijving\nNieuwe spraak');
  assert.equal(appendSpeech('', 'Ruit vervangen'), 'Ruit vervangen');
  assert.equal(appendSpeech('a'.repeat(1998), 'b')!.length, 2000);
  assert.equal(appendSpeech('a'.repeat(1999), 'b'), null);
});
