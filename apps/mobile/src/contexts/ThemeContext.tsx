import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { themePalettes, type AppTheme, type SapphirePalette } from '../constants/sapphire';

const THEME_KEY = 'glaszetter_app_theme';
const ThemeContext = createContext({
  theme: 'dark' as AppTheme,
  palette: themePalettes.dark,
  saving: false,
  error: '',
  setTheme: async (_theme: AppTheme): Promise<void> => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<AppTheme>('dark');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const stored =
          Platform.OS === 'web'
            ? typeof localStorage === 'undefined'
              ? null
              : localStorage.getItem(THEME_KEY)
            : await SecureStore.getItemAsync(THEME_KEY);
        if (active && (stored === 'dark' || stored === 'light')) updateTheme(stored);
      } catch {
        if (active) setError('Je opgeslagen thema kon niet worden geladen. Kies het opnieuw.');
      } finally {
        if (active) setReady(true);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);

  async function setTheme(next: AppTheme) {
    if (locked.current) return;
    locked.current = true;
    const previous = theme;
    updateTheme(next);
    setSaving(true);
    setError('');
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') throw new Error('Storage unavailable');
        localStorage.setItem(THEME_KEY, next);
      } else await SecureStore.setItemAsync(THEME_KEY, next);
    } catch {
      updateTheme(previous);
      setError('Thema bewaren is mislukt. Probeer het opnieuw.');
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  const palette = themePalettes[theme];
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, justifyContent: 'center' }}>
        <ActivityIndicator color={palette.blue} accessibilityLabel="Thema laden" />
      </View>
    );
  return (
    <ThemeContext.Provider value={{ theme, palette, saving, error, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
export const useSapphire = () => useAppTheme().palette;
export function useThemedStyles<T>(createStyles: (palette: SapphirePalette) => T): T {
  const palette = useSapphire();
  return useMemo(() => createStyles(palette), [createStyles, palette]);
}
