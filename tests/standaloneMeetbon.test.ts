import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
test('standalone Android meetbon persists without losing project details or pane quantities', () => {
  const nodes: Record<string, any> = {};
  const node = (id: string) => nodes[id] ??= { value: '', textContent: '', innerHTML: '', hidden: false, addEventListener() {}, reset() {}, querySelectorAll() { return []; } };
  let stored = '';
  const context = createContext({ document: { getElementById: node, querySelectorAll: () => [] }, localStorage: { getItem: () => stored || null, setItem: (_: string, v: string) => { stored = v; } }, scrollTo() {}, confirm: () => true, alert() {} });
  const root = 'apps/glass-measurement-android/app/src/main/assets/';
  runInContext(readFileSync(root + 'meetbon-fields.js', 'utf8'), context);
  runInContext(readFileSync(root + 'app.js', 'utf8'), context);
  runInContext("projects=[{id:'123',customer:'Klant',address:'Straat',notes:'Bewaren',panes:[{quantity:2,orderWidth:875,orderHeight:484}],meetbon:{fields:{postalCode:'1234 AB'},checks:{g5c0:true}}}];openProject('123');", context);
  node('customer').value = 'Nieuwe naam';
  node('projectForm').onsubmit({ preventDefault() {} });
  const saved = JSON.parse(stored)[0];
  assert.equal(saved.customer, 'Nieuwe naam');
  assert.equal(saved.meetbon.fields.postalCode, '1234 AB');
  assert.equal(saved.meetbon.checks.g5c0, true);
  assert.equal(saved.panes[0].quantity, 2);
  assert.equal(node('paneCount').textContent, 2);
  assert.ok(Math.abs(runInContext('projectArea(projects[0])', context) - 0.847) < 0.001);
});

function draftHarness(storage: Map<string, string>, fail = { value: false }) {
  const nodes: Record<string, any> = {};
  const node = (id: string): any => nodes[id] ??= {
    value: '', textContent: '', hidden: false, html: '', fields: [], checks: [], events: {},
    reset() {}, addEventListener(name: string, fn: any) { this.events[name] = fn; },
    querySelectorAll(selector: string) { return selector === '[data-field]' ? this.fields : this.checks; },
    get innerHTML() { return this.html; },
    set innerHTML(html: string) {
      this.html = html;
      this.fields = [...html.matchAll(/data-field="([^"]+)" value="([^"]*)"/g)].map(m => ({ dataset: { field: m[1] }, value: m[2] }));
      this.checks = [...html.matchAll(/data-check="([^"]+)" (checked)?/g)].map(m => ({ dataset: { check: m[1] }, checked: !!m[2] }));
    },
  };
  const context = createContext({ document: { getElementById: node, querySelectorAll: () => [] },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { if (fail.value) throw new Error('full'); storage.set(key, value); } },
    scrollTo() {}, confirm: () => true, alert() {},
  });
  const root = 'apps/glass-measurement-android/app/src/main/assets/';
  runInContext(readFileSync(root + 'meetbon-fields.js', 'utf8'), context);
  runInContext(readFileSync(root + 'app.js', 'utf8'), context);
  const field = (key: string) => node('meetbonFields').fields.find((x: any) => x.dataset.field === key);
  return { context, node, field, edit(key: string, value: string) { field(key).value = value; node('meetbonFields').events.input(); } };
}
const draftProject = () => ({ id: '123', customer: 'Klant', address: 'Straat', notes: 'Bewaren', panes: [], meetbon: { fields: { name: 'Opgeslagen', postalCode: '1234 AB' }, checks: {} } });
const draftStore = () => new Map([['glaszetter_snel_projects_v1', JSON.stringify([draftProject()])]]);
test('Android draft survives project save, pane navigation and a full restart; explicit save clears it', () => {
  const storage = draftStore(); const app = draftHarness(storage);
  runInContext("openProject('123')", app.context);
  app.edit('name', 'Conceptnaam');
  app.node('meetbonFields').checks[0].checked = true;
  app.node('meetbonFields').events.change();
  app.node('customer').value = 'Nieuwe klant';
  app.node('projectForm').onsubmit({ preventDefault() {} });
  assert.equal(app.field('name').value, 'Conceptnaam');
  runInContext('openPaneForm();backToProject()', app.context);
  assert.equal(app.field('name').value, 'Conceptnaam');
  const restarted = draftHarness(storage);
  runInContext("openProject('123')", restarted.context);
  assert.equal(restarted.field('name').value, 'Conceptnaam');
  assert.equal(restarted.node('meetbonFields').checks[0].checked, true);
  assert.equal(JSON.parse(storage.get('glaszetter_snel_projects_v1')!)[0].meetbon.fields.name, 'Opgeslagen');
  restarted.node('meetbonForm').onsubmit({ preventDefault() {} });
  const saved = JSON.parse(storage.get('glaszetter_snel_projects_v1')!)[0];
  assert.equal(saved.meetbon.fields.name, 'Conceptnaam');
  assert.equal(saved.meetbonDraft, undefined);
  assert.equal(saved.customer, 'Nieuwe klant');
});
test('Android storage failure keeps draft input and reports no successful save', () => {
  const storage = draftStore(); const fail = { value: false }; const app = draftHarness(storage, fail);
  runInContext("openProject('123')", app.context);
  fail.value = true; app.edit('name', 'Niet verloren');
  assert.match(app.node('meetbonStatus').textContent, /mislukt/);
  app.node('meetbonForm').onsubmit({ preventDefault() {} });
  assert.match(app.node('meetbonStatus').textContent, /mislukt/);
  assert.equal(app.field('name').value, 'Niet verloren');
  assert.equal(JSON.parse(storage.get('glaszetter_snel_projects_v1')!)[0].meetbon.fields.name, 'Opgeslagen');
  fail.value = false; app.node('meetbonForm').onsubmit({ preventDefault() {} });
  assert.equal(JSON.parse(storage.get('glaszetter_snel_projects_v1')!)[0].meetbon.fields.name, 'Niet verloren');
});
test('Android ignores an old draft when the saved bon has changed and preserves intentionally empty fields', () => {
  const p: any = draftProject();
  p.meetbonDraft = { base: JSON.stringify(p.meetbon), data: { fields: { name: 'Oud concept' }, checks: {} } };
  p.meetbon = { fields: { name: '' }, checks: {} };
  const app = draftHarness(new Map([['glaszetter_snel_projects_v1', JSON.stringify([p])]]));
  runInContext("openProject('123')", app.context);
  assert.equal(app.field('name').value, '');
  assert.match(app.node('meetbonStatus').textContent, /ouder concept/);
});
test('drafts remain isolated between projects', () => {
  const a = draftProject(); const b = { ...draftProject(), id: '456' };
  const app = draftHarness(new Map([['glaszetter_snel_projects_v1', JSON.stringify([a, b])]]));
  runInContext("openProject('123')", app.context); app.edit('name', 'Project A');
  runInContext("openProject('456')", app.context); assert.equal(app.field('name').value, 'Opgeslagen');
  app.edit('name', 'Project B');
  runInContext("openProject('123')", app.context); assert.equal(app.field('name').value, 'Project A');
});
