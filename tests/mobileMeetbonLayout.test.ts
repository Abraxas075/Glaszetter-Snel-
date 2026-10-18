import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { act, create } from 'react-test-renderer';
import * as shared from '../packages/shared/src/index';
import { lightSapphire } from '../apps/mobile/src/constants/sapphire';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../apps/mobile/src/screens/MeetbonScreen.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function harness() {
  const saved: any[] = [];
  const state = { failSave: false };
  const module = { exports: {} as any };
  class ApiError extends Error {}
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name: string) => {
      if (name === 'react-native') return { View: 'View', Text: 'Text', TextInput: 'TextInput', Switch: 'Switch', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, StyleSheet: { create: (s: any) => s } };
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (name === 'expo-router') return { useRouter: () => ({ back() {} }) };
      if (name === '@glaszetter/shared') return shared;
      if (name === '../contexts/AuthContext') return { useAuth: () => ({ token: 'test' }) };
      if (name === '../contexts/ThemeContext') return { useSapphire: () => lightSapphire, useThemedStyles: (factory: any) => factory(lightSapphire) };
      if (name === '../components/GlassTypeSelect') return { GlassTypeSelect: 'GlassTypeSelect' };
      if (name === '../components/MeetbonSpeechInput') return { MeetbonSpeechInput: 'TextInput' };
      if (name === '../components/GlassPanel') return { GlassPanel: 'GlassPanel' };
      if (name === '../components/GoogleMapsActions') return { JobMapsActions: 'JobMapsActions' };
      if (name === '../utils/googleMaps') return { meetbonMapLocation: shared.meetbonMapLocation };
      if (name === '../api/meetbonPdf') return { shareMeetbonPdf: async () => {} };
      if (name === '../api/client') return { ApiError, apiRequest: async (_url: string, options: any) => {
        if (options.method === 'PUT') {
          if (state.failSave) throw new Error('Offline');
          const data = JSON.parse(options.body); saved.push(data); return { ...data, revision: 'saved' };
        }
        return shared.emptyMeetbon();
      } };
      return require(name);
    },
  });
  return { element: React.createElement(module.exports.MeetbonScreen, { jobId: 'job-test' }), saved, state };
}
function text(node: any): string { return typeof node === 'string' ? node : node.children.map(text).join(''); }
function button(tree: any, label: string) { return tree.root.findAllByType('Pressable').find((n: any) => text(n) === label)!; }

test('collapsing meetbon sections retains hidden input and saves the complete form', async () => {
  const h = harness(); let tree: any;
  await act(async () => { tree = create(h.element); });
  await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Naam' }).props.onChangeText('Testklant'); });
  await act(async () => { button(tree, 'Alles sluiten').props.onPress(); });
  assert.equal(tree.root.findAllByType('TextInput').length, 0);
  await act(async () => { button(tree, 'Meetbon opslaan').props.onPress(); });
  assert.equal(h.saved.length, 1);
  assert.equal(h.saved[0].fields.name, 'Testklant');
  await act(async () => { button(tree, 'Alles openen').props.onPress(); });
  assert.equal(tree.root.findByProps({ accessibilityLabel: 'Naam' }).props.value, 'Testklant');
  const labels = tree.root.findAllByType('TextInput').map((n: any) => n.props.accessibilityLabel);
  for (const section of shared.MEETBON_SECTIONS) for (const field of section.fields) assert.ok(labels.includes(field.label), field.label);
  assert.equal(tree.root.findAllByType('Switch').length, shared.MEETBON_SECTIONS.reduce((n, s) => n + s.checks.length, 0));
  await act(async () => { tree.unmount(); });
});

test('a failed save leaves input intact and allows retry from the footer', async () => {
  const h = harness(); let tree: any;
  await act(async () => { tree = create(h.element); });
  await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Naam' }).props.onChangeText('Blijft bewaard'); });
  h.state.failSave = true;
  await act(async () => { button(tree, 'Meetbon opslaan').props.onPress(); });
  assert.equal(tree.root.findByProps({ accessibilityLabel: 'Naam' }).props.value, 'Blijft bewaard');
  assert.ok(text(tree.root).includes('Opslaan mislukt'));
  h.state.failSave = false;
  await act(async () => { button(tree, 'Meetbon opslaan').props.onPress(); });
  assert.equal(h.saved[0].fields.name, 'Blijft bewaard');
  await act(async () => { tree.unmount(); });
});
