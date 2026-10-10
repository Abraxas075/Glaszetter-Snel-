import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { sapphire } from '../constants/sapphire';
export function GlassPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.panel, style]}>
      <View pointerEvents="none" accessible={false} style={styles.reflection} />
      <View pointerEvents="none" accessible={false} style={styles.inner} />
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(180,225,240,0.06)',
    transform: [{ rotate: '35deg' }],
  },
});
