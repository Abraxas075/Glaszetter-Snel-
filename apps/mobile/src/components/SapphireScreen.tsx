import React from 'react';
import { Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SapphirePalette } from '../constants/sapphire';
import { useThemedStyles } from '../contexts/ThemeContext';
export function SapphireScreen({ title, children, centerContent = false }: { title?: string; children: React.ReactNode; centerContent?: boolean }) {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, centerContent && styles.centeredContent]}>
        {title && (
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
const createSapphireStyles = (sapphire: SapphirePalette) => StyleSheet.create({
  text: { color: sapphire.text, fontSize: 16 },
  muted: { color: sapphire.muted, fontSize: 14, lineHeight: 21 },
  card: { padding: 18, marginBottom: 12, gap: 8 },
  title: { color: sapphire.text, fontSize: 19, fontWeight: '600' },
  action: {
    minHeight: 48,
    padding: 12,
    backgroundColor: sapphire.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  actionText: { color: sapphire.actionText, fontSize: 16, fontWeight: '600' },
});
const createStyles = (sapphire: SapphirePalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: sapphire.background },
  content: { padding: 16, paddingBottom: 28 },
  centeredContent: { flexGrow: 1, justifyContent: 'center' },
  title: {
    color: sapphire.text,
    fontSize: 30,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 24,
  },
});

export function useSapphireStyles() {
  return useThemedStyles(createSapphireStyles);
}
