import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SapphirePalette } from '../constants/sapphire';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';
export function GlassPanel({
  children,
  style,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'urgent';
  style?: StyleProp<ViewStyle>;
}) {
  const sapphire = useSapphire();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.panel, tone === 'urgent' && { borderColor: sapphire.red, borderWidth: 2 }, style]}>
      <View pointerEvents="none" accessible={false} style={styles.reflection} />
      <View pointerEvents="none" accessible={false} style={[styles.inner, tone === 'urgent' && {borderColor:sapphire.red}]} />
      {children}
    </View>
  );
}
const createStyles = (sapphire: SapphirePalette) => StyleSheet.create({
  panel: {
    backgroundColor: sapphire.glass,
    borderColor: sapphire.edge,
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    margin: 2,
    borderWidth: 1,
    borderColor: sapphire.inner,
  },
  reflection: {
    position: 'absolute',
    right: 12,
    top: -90,
    width: 18,
    height: 400,
    backgroundColor: sapphire.reflection,
    transform: [{ rotate: '35deg' }],
  },
});
