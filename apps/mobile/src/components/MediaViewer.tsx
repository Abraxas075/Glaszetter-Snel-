import { useEffect, useState } from 'react';
import { Linking, Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { safeMediaUrl, type JobMedia } from '@glaszetter/shared';
import { sapphire } from '../constants/sapphire';
import { sapphireStyles as s } from './SapphireScreen';

export function MediaViewer({ item, onClose }: { item: JobMedia | null; onClose: () => void }) {
  const [error, setError] = useState('');
  useEffect(() => setError(''), [item?.id]);
  const url = item && safeMediaUrl(item.url);
  if (!item || !url) return null;
  const source = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: sapphire.background }}>
        <Pressable accessibilityRole="button" onPress={onClose} style={s.action}>
          <Text style={s.actionText}>Sluiten</Text>
        </Pressable>
        <Text style={[s.text, { padding: 12 }]}>{item.caption || item.filename}</Text>
        {error && (
          <Text accessibilityRole="alert" style={s.text}>
            {error}
          </Text>
        )}
        {item.kind === 'video' && (
          <Pressable
            accessibilityRole="button"
            style={s.action}
            onPress={() =>
              Linking.openURL(url).catch(() => setError('Videospeler openen is mislukt.'))
            }
          >
            <Text style={s.actionText}>Openen in videospeler</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {item.kind === 'photo' ? (
            <Image
              source={{ uri: url }}
              accessibilityLabel={item.caption || 'Klusfoto'}
              style={{ flex: 1, resizeMode: 'contain' }}
            />
          ) : (
            <WebView
              key={item.id}
              source={{
                html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src https:; style-src 'unsafe-inline'"></head><body style="margin:0;background:#06182E;display:flex;align-items:center;height:100vh"><video controls playsinline preload="metadata" style="width:100%;max-height:100vh" src="${source}"></video></body></html>`,
              }}
              originWhitelist={['about:blank']}
              onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
              javaScriptEnabled={false}
              domStorageEnabled={false}
              setSupportMultipleWindows={false}
              allowFileAccess={false}
              mixedContentMode="never"
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction
              onError={() => setError('Afspelen is mislukt. Probeer Openen in videospeler.')}
              style={{ flex: 1, backgroundColor: sapphire.background }}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
