import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import {
  MEDIA_MAX_BYTES,
  PHOTO_MAX_BYTES,
  newChatClientId,
  normalizeChatText,
  safeMediaUrl,
  type ChatChannel,
  type ChatMessage,
  type ChatPage,
} from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useChatSession } from '../hooks/useChatSession';
import { MediaViewer } from '../components/MediaViewer';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { sapphire } from '../constants/sapphire';
type Draft = { text: string; clientId: string; file: ImagePicker.ImagePickerAsset | null };
const empty = (): Draft => ({ text: '', clientId: newChatClientId(), file: null });
export function ChatScreen() {
  const { user, token, isLoading } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]),
    [selected, setSelected] = useState<ChatChannel | null>(null),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setChannels([]);
    setSelected(null);
    setDrafts({});
    setError('');
    if (token)
      apiRequest<ChatChannel[]>('/chat/channels', { token })
        .then((value) => {
          if (active) setChannels(value);
        })
        .catch(() => {
          if (active) setError('Gesprekken laden is mislukt.');
        });
    return () => {
      active = false;
    };
  }, [token, revision]);
  if (isLoading) return <ActivityIndicator color={sapphire.blue} />;
  if (!user || !token) return <Redirect href="/login" />;
  const update = (channelId: string, next: Draft) =>
    setDrafts((previous) => ({ ...previous, [channelId]: next }));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={c.screen}>
      {selected ? (
        <Conversation
          key={`${token}:${selected.id}`}
          channel={selected}
          token={token}
          userId={user.id}
          draft={drafts[selected.id] || empty()}
          update={(next) => update(selected.id, next)}
          sent={(id) =>
            setDrafts((previous) =>
              previous[selected.id]?.clientId === id
                ? { ...previous, [selected.id]: empty() }
                : previous
            )
          }
          back={() => setSelected(null)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={c.title}>Chat</Text>
          <Text style={c.muted}>Met collega’s binnen je eigen bedrijf.</Text>
          {error ? (
            <>
              <Text accessibilityRole="alert" style={c.error}>
                {error}
              </Text>
              <Pressable style={c.button} onPress={() => setRevision((v) => v + 1)}>
                <Text style={c.text}>Opnieuw laden</Text>
              </Pressable>
            </>
          ) : channels.length === 0 ? (
            <ActivityIndicator color={sapphire.blue} />
          ) : null}
          {channels.map((channel) => (
            <Pressable
              accessibilityRole="button"
              key={channel.id}
              onPress={() => {
                if (!drafts[channel.id]) update(channel.id, empty());
                setSelected(channel);
              }}
              style={c.channel}
            >
              <Feather
                name={channel.kind === 'company' ? 'users' : 'briefcase'}
                color={sapphire.blue}
                size={22}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={c.text}>{channel.name}</Text>
                <Text style={c.small}>
                  {channel.kind === 'company'
                    ? 'Kantoor & team · iedereen in je bedrijf'
                    : drafts[channel.id]?.text
                      ? 'Concept bewaard'
                      : 'Gesprek bij deze klus'}
                </Text>
              </View>
              <Feather name="chevron-right" size={19} color={sapphire.blue} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
function Conversation({
  channel,
  token,
  userId,
  draft,
  update,
  sent,
  back,
}: {
  channel: ChatChannel;
  token: string;
  userId: string;
  draft: Draft;
  update: (next: Draft) => void;
  sent: (id: string) => void;
  back: () => void;
}) {
  const load = useCallback(
    (before?: string) =>
      apiRequest<ChatPage>(
        `/chat/channels/${channel.id}/messages${before ? `?before=${before}` : ''}`,
        { token }
      ),
    [channel.id, token]
  );
  const focused = useIsFocused(),
    [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (value) =>
      setForeground(value === 'active')
    );
    return () => subscription.remove();
  }, []);
  const session = useChatSession(load, focused && foreground);
  const [sending, setSending] = useState(false),
    [sendError, setSendError] = useState(''),
    [viewing, setViewing] = useState<ChatMessage | null>(null);
  const locked = useRef(false),
    alive = useRef(true),
    scroll = useRef<ScrollView>(null),
    nearBottom = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (nearBottom.current) scroll.current?.scrollToEnd({ animated: false });
  }, [session.messages.length]);
  async function pick() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSendError('Geef toestemming om een foto of video te kiezen.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });
      if (!alive.current || result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      if ((file.fileSize || 0) > (file.type === 'video' ? MEDIA_MAX_BYTES : PHOTO_MAX_BYTES)) {
        setSendError('Foto maximaal 15 MB; video maximaal 50 MB.');
        return;
      }
      update({ ...draft, file, clientId: newChatClientId() });
      setSendError('');
    } catch {
      if (alive.current) setSendError('Galerij openen is mislukt.');
    }
  }
  async function send() {
    if (locked.current || (!draft.file && !normalizeChatText(draft.text))) return;
    locked.current = true;
    setSending(true);
    setSendError('');
    const snapshot = draft;
    try {
      let message: ChatMessage;
      if (snapshot.file) {
        const file = snapshot.file,
          body = new FormData(),
          name = file.fileName || (file.type === 'video' ? 'video.mp4' : 'foto.jpg');
        if (Platform.OS === 'web') body.append('file', await (await fetch(file.uri)).blob(), name);
        else
          body.append('file', {
            uri: file.uri,
            name,
            type: file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg'),
          } as unknown as Blob);
        body.append('text', snapshot.text);
        body.append('clientId', snapshot.clientId);
        message = await apiRequest<ChatMessage>(`/chat/channels/${channel.id}/attachments`, {
          token,
          method: 'POST',
          body,
        });
      } else
        message = await apiRequest<ChatMessage>(`/chat/channels/${channel.id}/messages`, {
          token,
          method: 'POST',
          body: JSON.stringify({ text: snapshot.text, clientId: snapshot.clientId }),
        });
      sent(snapshot.clientId);
      if (alive.current) {
        session.append(message);
        nearBottom.current = true;
        scroll.current?.scrollToEnd({ animated: true });
      }
    } catch {
      if (alive.current)
        setSendError(
          'Versturen niet bevestigd. Je bericht blijft staan; tik opnieuw op Versturen om veilig te proberen.'
        );
    } finally {
      locked.current = false;
      if (alive.current) setSending(false);
    }
  }
  const media = useMemo(
    () =>
      viewing?.attachment
        ? {
            id: viewing.id,
            jobId: channel.id,
            kind: viewing.attachment.kind,
            url: viewing.attachment.url,
            filename: viewing.attachment.filename,
            caption: viewing.text,
            createdAt: viewing.createdAt,
          }
        : null,
    [viewing, channel.id]
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <MediaViewer item={media} onClose={() => setViewing(null)} />
      <View style={c.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Terug naar gesprekken"
          onPress={back}
          style={c.iconButton}
        >
          <Feather name="arrow-left" size={22} color={sapphire.blue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={c.text}>
            {channel.name}
          </Text>
          <Text style={c.small}>Zichtbaar voor je bedrijf</Text>
        </View>
      </View>
      {session.error && (
        <Pressable onPress={session.retry}>
          <Text accessibilityRole="alert" style={c.error}>
            {session.error} Opnieuw laden
          </Text>
        </Pressable>
      )}
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={c.messages}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          nearBottom.current =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 90;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (nearBottom.current) scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        {session.hasOlder && (
          <Pressable
            style={c.button}
            disabled={session.olderLoading}
            onPress={() => {
              nearBottom.current = false;
              void session.older();
            }}
          >
            <Text style={c.text}>{session.olderLoading ? 'Laden…' : 'Oudere berichten'}</Text>
          </Pressable>
        )}
        {session.loading ? (
          <ActivityIndicator color={sapphire.blue} />
        ) : !session.messages.length && !session.error ? (
          <Text style={c.muted}>Nog geen berichten. Begin het gesprek.</Text>
        ) : null}
        {session.messages.map((message) => (
          <View
            key={message.id}
            style={[c.bubble, message.senderId === userId ? c.own : undefined]}
          >
            <Text style={c.sender}>{message.senderName}</Text>
            {message.attachment && safeMediaUrl(message.attachment.url) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${message.attachment.kind === 'video' ? 'Video' : 'Foto'} openen`}
                onPress={() => setViewing(message)}
                style={c.attachment}
              >
                {message.attachment.kind === 'video' ? (
                  <VideoThumbnail url={message.attachment.url} />
                ) : (
                  <Image
                    source={{ uri: message.attachment.url }}
                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                  />
                )}
              </Pressable>
            )}
            {!!message.text && (
              <Text selectable style={c.text}>
                {message.text}
              </Text>
            )}
            <Text style={c.small}>
              {new Date(message.createdAt).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={c.composer}>
        {draft.file && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={[c.small, { flex: 1 }]}>
              {draft.file.fileName || 'Bijlage geselecteerd'}
            </Text>
            <Pressable
              disabled={sending}
              accessibilityLabel="Bijlage verwijderen"
              style={c.iconButton}
              onPress={() => update({ ...draft, file: null, clientId: newChatClientId() })}
            >
              <Feather name="x" size={18} color={sapphire.text} />
            </Pressable>
          </View>
        )}
        {sendError && (
          <Text accessibilityRole="alert" style={c.error}>
            {sendError}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Pressable
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Foto of video toevoegen"
            style={c.iconButton}
            onPress={() => void pick()}
          >
            <Feather name="paperclip" size={22} color={sapphire.blue} />
          </Pressable>
          <TextInput
            accessibilityLabel="Bericht"
            multiline
            maxLength={4000}
            placeholder="Schrijf een bericht…"
            placeholderTextColor={sapphire.muted}
            value={draft.text}
            editable={!sending}
            onChangeText={(text) => update({ ...draft, text, clientId: newChatClientId() })}
            style={c.input}
          />
          <Pressable
            disabled={sending || (!draft.file && !normalizeChatText(draft.text))}
            accessibilityRole="button"
            accessibilityLabel="Versturen"
            onPress={() => void send()}
            style={[
              c.send,
              { opacity: sending || (!draft.file && !normalizeChatText(draft.text)) ? 0.5 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={sapphire.background} />
            ) : (
              <Feather name="send" size={20} color={sapphire.background} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const c = StyleSheet.create({
  screen: { flex: 1, backgroundColor: sapphire.background },
  title: { fontFamily: 'serif', fontSize: 30, color: sapphire.text, marginBottom: 12 },
  text: { color: sapphire.text, fontSize: 15, lineHeight: 22 },
  muted: { color: sapphire.muted, fontSize: 14, lineHeight: 21 },
  small: { color: sapphire.muted, fontSize: 11, lineHeight: 16 },
  error: { color: '#FF8290', fontSize: 13, lineHeight: 19, padding: 10 },
  channel: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: sapphire.inner,
    backgroundColor: sapphire.glass,
    marginTop: 12,
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: sapphire.inner,
  },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: 14, gap: 12 },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    minWidth: 100,
    padding: 12,
    gap: 7,
    backgroundColor: sapphire.glass,
    borderWidth: 1,
    borderColor: sapphire.inner,
  },
  own: { alignSelf: 'flex-end', backgroundColor: '#103A58', borderColor: '#197BA8' },
  sender: { color: sapphire.muted, fontSize: 12, fontWeight: '500' },
  attachment: { width: 220, maxWidth: '100%', height: 165, backgroundColor: sapphire.background },
  composer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: sapphire.inner,
    backgroundColor: sapphire.glass,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    padding: 10,
    borderWidth: 1,
    borderColor: sapphire.inner,
    color: sapphire.text,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    backgroundColor: sapphire.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: sapphire.inner,
    alignItems: 'center',
  },
});
