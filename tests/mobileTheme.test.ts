import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { sapphire, lightSapphire } from '../apps/mobile/src/constants/sapphire';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(new URL('../apps/mobile/src/contexts/ThemeContext.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }
).outputText;

function harness(os = 'android', initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set('glaszetter_app_theme', initial);
  const storage = { fail: false, writes: 0 };
  const save = (key: string, value: string) => {
    storage.writes++;
    if (storage.fail) throw new Error('Disk unavailable');
    values.set(key, value);
  };
  const module = { exports: {} as any };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    localStorage: { getItem: (key: string) => values.get(key), setItem: save },
    require: (name: string) => {
      if (name === 'react-native')
        return { Platform: { OS: os }, View: 'View', ActivityIndicator: 'ActivityIndicator' };
      if (name === 'expo-secure-store')
        return {
          getItemAsync: async (key: string) => values.get(key),
          setItemAsync: async (key: string, value: string) => save(key, value),
        };
      if (name === '../constants/sapphire')
        return { themePalettes: { dark: sapphire, light: lightSapphire } };
      return require(name);
    },
  });
  const { ThemeProvider, useAppTheme, useThemedStyles } = module.exports;
  let state: any;
  function Probe() {
    state = useAppTheme();
    const styles = useThemedStyles((palette: any) => ({
      backgroundColor: palette.background,
      padding: 16,
    }));
    return React.createElement('ThemeProbe', { style: styles });
  }
  const element = () => React.createElement(ThemeProvider, null, React.createElement(Probe));
  return { values, storage, element, state: () => state };
}

test('mobile theme switches immediately across consumers and survives an app restart', async () => {
  const h = harness();
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(h.element());
  });
  assert.equal(h.state().theme, 'dark');
  await act(async () => {
    await h.state().setTheme('light');
  });
  assert.equal(h.state().palette, lightSapphire);
  assert.equal(
    tree!.root.findByType('ThemeProbe').props.style.backgroundColor,
    lightSapphire.background
  );
  assert.equal(tree!.root.findByType('ThemeProbe').props.style.padding, 16);
  assert.equal(h.values.get('glaszetter_app_theme'), 'light');
  await act(async () => {
    tree!.unmount();
    tree = create(h.element());
  });
  assert.equal(h.state().theme, 'light');
  await act(async () => {
    await h.state().setTheme('dark');
  });
  assert.equal(h.state().palette, sapphire);
  await act(async () => {
    tree!.unmount();
  });
});

test('a failed preference write restores the prior theme and allows a retry', async () => {
  const h = harness('android', 'light');
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(h.element());
  });
  h.storage.fail = true;
  await act(async () => {
    await h.state().setTheme('dark');
  });
  assert.equal(h.state().theme, 'light');
  assert.equal(h.state().saving, false);
  assert.match(h.state().error, /bewaren is mislukt/);
  assert.equal(h.values.get('glaszetter_app_theme'), 'light');
  h.storage.fail = false;
  await act(async () => {
    await h.state().setTheme('dark');
  });
  assert.equal(h.state().theme, 'dark');
  assert.equal(h.state().error, '');
  await act(async () => {
    tree!.unmount();
  });
});

test('web preference storage and invalid stored values use the same theme selection', async () => {
  const h = harness('web', 'invalid');
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(h.element());
  });
  assert.equal(h.state().theme, 'dark');
  await act(async () => {
    await h.state().setTheme('light');
  });
  assert.equal(h.values.get('glaszetter_app_theme'), 'light');
  assert.equal(h.storage.writes, 1);
  await act(async () => {
    tree!.unmount();
  });
});

test('light theme preserves the brand and keeps primary text and buttons readable', () => {
  function luminance(hex: string) {
    const values = hex
      .slice(1)
      .match(/../g)!
      .map((n) => parseInt(n, 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  for (const [text, surface] of [
    [lightSapphire.text, lightSapphire.glass],
    [lightSapphire.muted, lightSapphire.background],
    [lightSapphire.onPrimary, lightSapphire.blue],
    [lightSapphire.onAccent, lightSapphire.red],
    [lightSapphire.link, lightSapphire.background],
  ]) {
    const a = luminance(text),
      b = luminance(surface);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${text} on ${surface}`);
  }
  assert.equal(lightSapphire.blue, sapphire.blue);
  assert.equal(lightSapphire.red, sapphire.red);
});
