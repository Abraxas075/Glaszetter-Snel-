import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installUnsavedWarning } from '../apps/web/src/lib/unsavedWarning';

function setup() {
  const win = new EventTarget() as any;
  const doc = new EventTarget() as any;
  const formState = { __NA: true, tree: 'original-router-state' };
  win.location = { href: 'https://example.test/dashboard/spoed' };
  const writes: any[] = [];
  win.history = { state: formState, pushState(state: any, _: string, url: string) { writes.push({ state, url }); win.location.href = url; } };
  let confirms = 0;
  win.confirm = () => { confirms++; return false; };
  const value = { dirty: true, busy: false, bypass: false, message: 'Invoer niet opgeslagen' };
  const remove = installUnsavedWarning(win, doc, () => value, () => { value.bypass = true; });
  return { win, value, writes, remove, confirms: () => confirms, formState };
}
test('opening and saving a dirty form adds no phantom history entries', () => {
  const env = setup(); assert.equal(env.writes.length, 0);
  env.value.bypass = true;
  const event = new Event('beforeunload', { cancelable: true }); env.win.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  env.remove(); assert.equal(env.writes.length, 0);
});
test('declining Back restores the form URL and router state before the router receives the event', () => {
  const env = setup(); let routerEvents = 0;
  env.win.addEventListener('popstate', () => routerEvents++);
  env.win.location.href = 'https://example.test/dashboard';
  env.win.dispatchEvent(new Event('popstate'));
  assert.equal(routerEvents, 0); assert.equal(env.confirms(), 1);
  assert.deepEqual(env.writes, [{ state: env.formState, url: 'https://example.test/dashboard/spoed' }]);
  env.remove();
});
test('accepting Back lets the router handle one event and bypasses a second unload prompt', () => {
  const env = setup(); env.win.confirm = () => true; let routerEvents = 0;
  env.win.addEventListener('popstate', () => routerEvents++);
  env.win.dispatchEvent(new Event('popstate'));
  assert.equal(routerEvents, 1); assert.equal(env.writes.length, 0); assert.equal(env.value.bypass, true);
  const event = new Event('beforeunload', { cancelable: true }); env.win.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false); env.remove();
});
test('saving blocks Back, while refresh warns; cleanup removes all guards', () => {
  const env = setup(); env.value.busy = true;
  env.win.dispatchEvent(new Event('popstate')); assert.equal(env.confirms(), 0); assert.equal(env.writes.length, 1);
  const refresh = new Event('beforeunload', { cancelable: true }); env.win.dispatchEvent(refresh); assert.equal(refresh.defaultPrevented, true);
  env.remove();
  const next = new Event('beforeunload', { cancelable: true }); env.win.dispatchEvent(next); assert.equal(next.defaultPrevented, false);
});
