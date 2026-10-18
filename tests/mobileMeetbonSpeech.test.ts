import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { lightSapphire } from '../apps/mobile/src/constants/sapphire';
import * as dictation from '../apps/mobile/src/utils/meetbonDictation';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../apps/mobile/src/components/MeetbonSpeechInput.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function harness(kind = 'text') {
  let setVoice: any;
  const state = { stopped: 0, started: 0, denied: false };
  const applied: string[] = [];
  const module = { exports: {} as any };
  function useVoiceCapture() {
    const [voice, set] = React.useState({ transcript: '', isListening: false, error: null as string | null });
    setVoice = set;
    return { ...voice,
      start: async () => { state.started++; set({ transcript: '', isListening: !state.denied, error: state.denied ? 'Microfoon-toestemming geweigerd' : null }); },
      stop: () => { state.stopped++; set(v => ({ ...v, isListening: false })); },
      reset: () => set({ transcript: '', isListening: false, error: null }),
    };
  }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (name: string) => {
    if (name === 'react-native') return { View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, StyleSheet: { create: (s: any) => s } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name === '../contexts/ThemeContext') return { useSapphire: () => lightSapphire, useThemedStyles: (factory: any) => factory(lightSapphire) };
    if (name === '../hooks/useVoiceCapture') return { useVoiceCapture };
    if (name === '../utils/meetbonDictation') return dictation;
    return require(name);
  } });
  return { element: React.createElement(module.exports.DictationDialog, { label: 'Breedte (mm)', kind, onClose() {}, onApply: (value: string) => applied.push(value) }), state, applied,
    result: (transcript: string, listening = false) => setVoice({ transcript, isListening: listening, error: null }) };
}
function text(node: any): string { return typeof node === 'string' ? node : node.children.map(text).join(''); }
function button(tree: any, label: string) { return tree.root.findAllByType('Pressable').find((n: any) => text(n) === label)!; }

test('speech requires confirmation, preserves manual corrections, and cancels capture', async () => {
  const h = harness(); let tree: any;
  await act(async () => { tree = create(h.element); });
  await act(async () => { button(tree, 'Start inspreken').props.onPress(); });
  await act(async () => { h.result('Herkende tekst', true); });
  assert.equal(button(tree, 'Tekst gebruiken').props.disabled, true);
  assert.equal(h.applied.length, 0);
  await act(async () => { h.result('Herkende tekst'); });
  await act(async () => { tree.root.findByType('TextInput').props.onChangeText('Zelf gecorrigeerd'); });
  await act(async () => { h.result('Later herkenningsresultaat'); });
  assert.equal(tree.root.findByType('TextInput').props.value, 'Zelf gecorrigeerd');
  await act(async () => { button(tree, 'Tekst gebruiken').props.onPress(); });
  assert.equal(h.applied[0], 'Zelf gecorrigeerd');
  await act(async () => { button(tree, 'Annuleren').props.onPress(); });
  assert.ok(h.state.stopped > 0);
  await act(async () => { tree.unmount(); });
});
test('invalid spoken dimensions and denied microphone permission do not apply a value', async () => {
  const h = harness('dimension'); let tree: any;
  await act(async () => { tree = create(h.element); });
  h.state.denied = true;
  await act(async () => { button(tree, 'Start inspreken').props.onPress(); });
  assert.ok(text(tree.root).includes('Microfoon-toestemming geweigerd'));
  assert.equal(h.applied.length, 0);
  await act(async () => { h.result('875 bij 484'); });
  await act(async () => { button(tree, 'Waarde gebruiken').props.onPress(); });
  assert.equal(h.applied.length, 0);
  assert.ok(text(tree.root).includes('Gebruik één getal'));
  await act(async () => { tree.root.findByType('TextInput').props.onChangeText('875 mm'); });
  await act(async () => { button(tree, 'Waarde gebruiken').props.onPress(); });
  assert.equal(h.applied[0], '875');
  await act(async () => { tree.unmount(); });
});
