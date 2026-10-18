import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { safeMediaUrl } from '@glaszetter/shared';
import { createThumbnailLoader } from '../lib/thumbnailLoader';
import type { SapphirePalette } from '../constants/sapphire';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';

const loadThumbnail = createThumbnailLoader(async (url) => {
  const result = await VideoThumbnails.getThumbnailAsync(url, { time: 0, quality: 0.45 });
  return result.uri;
});

export function VideoThumbnail({ url, retryKey = 0 }: { url: string; retryKey?: number }) {
  const sapphire = useSapphire();
  const styles = useThemedStyles(createStyles);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setThumbnail(null);
    setFailed(false);
    const source = safeMediaUrl(url);
    if (!source || Platform.OS === 'web') {
      setFailed(true);
      return;
    }
    loadThumbnail(source)
      .then((uri) => {
        if (active) setThumbnail(uri);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [url, retryKey]);
  return (
    <View style={styles.container} accessible={false}>
      {thumbnail && !failed && (
        <Image
          source={{ uri: thumbnail }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => {
            const source = safeMediaUrl(url);
            if (source) loadThumbnail.invalidate(source);
            setFailed(true);
          }}
        />
      )}
      <View style={[styles.play, thumbnail && !failed ? styles.overlay : undefined]}>
        <Feather name="play" size={21} color={thumbnail && !failed ? sapphire.onAccent : sapphire.text} />
      </View>
      {!thumbnail || failed ? (
        <Text style={styles.label}>{failed ? 'Video bekijken' : 'Miniatuur laden…'}</Text>
      ) : null}
    </View>
  );
}
const createStyles = (sapphire: SapphirePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sapphire.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  play: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sapphire.glass,
    borderWidth: 1,
    borderColor: sapphire.inner,
  },
  overlay: { backgroundColor: 'rgba(6,24,46,0.8)', borderColor: 'rgba(243,247,252,0.65)' },
  label: { color: sapphire.muted, fontSize: 11 },
});
