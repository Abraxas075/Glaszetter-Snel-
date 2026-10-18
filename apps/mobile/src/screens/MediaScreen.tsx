import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { Platform } from 'react-native';
import type { Job, JobMedia, PaginatedResponse } from '@glaszetter/shared';
import { MEDIA_MAX_BYTES, PHOTO_MAX_BYTES, safeMediaUrl } from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { SapphireScreen, sapphireStyles as s } from '../components/SapphireScreen';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { MediaViewer } from '../components/MediaViewer';
import { GlassPanel } from '../components/GlassPanel';
import { sapphire } from '../constants/sapphire';

export function MediaScreen() {
  const { token, user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]),
    [jobId, setJobId] = useState(''),
    [search, setSearch] = useState('');
  const [items, setItems] = useState<JobMedia[]>([]),
    [kind, setKind] = useState('all');
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState(''),
    [jobsError, setJobsError] = useState(''),
    [message, setMessage] = useState(''),
    [caption, setCaption] = useState('');
  const [revision, setRevision] = useState(0),
    [jobsRevision, setJobsRevision] = useState(0);
  const [selected, setSelected] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadExpanded, setUploadExpanded] = useState(false);
  const [viewing, setViewing] = useState<JobMedia | null>(null);
  const mounted = useRef(true),
    uploading = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) return;
      setJobs([]);
      setJobsLoading(true);
      setJobsError('');
      (async () => {
        const all: Job[] = [];
        for (let page = 1; ; page++) {
          const result = await apiRequest<PaginatedResponse<Job>>(`/jobs?limit=100&page=${page}`, {
            token,
          });
          all.push(...result.data);
          if (page >= result.totalPages) break;
        }
        if (active) setJobs(all);
      })()
        .catch(() => {
          if (active) setJobsError('Klussen laden is mislukt.');
        })
        .finally(() => {
          if (active) setJobsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [token, jobsRevision])
  );
  useEffect(() => {
    let active = true;
    setItems([]);
    setError('');
    setMessage('');
    if (!token || !jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<JobMedia[]>(`/media?jobId=${jobId}`, { token })
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError('Beelden laden is mislukt. Tik op Vernieuwen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, jobId, revision]);
  async function pick(camera: boolean) {
    setError('');
    setMessage('');
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          'Geen toestemming. Geef toegang tot je camera of mediabibliotheek in de telefooninstellingen.'
        );
        return;
      }
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        videoMaxDuration: 60,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if ((asset.fileSize || 0) > (asset.type === 'video' ? MEDIA_MAX_BYTES : PHOTO_MAX_BYTES)) {
          setError('Bestand te groot: maximaal 15 MB per foto en 50 MB per video.');
          return;
        }
        setSelected(asset);
        setUploadExpanded(true);
      }
    } catch {
      setError('Camera of galerij openen is mislukt. Probeer opnieuw.');
    }
  }
  async function upload() {
    if (!selected || !token || !jobId || uploading.current) return;
    uploading.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      const video = selected.type === 'video';
      const name = selected.fileName || (video ? 'video.mp4' : 'foto.jpg');
      if (Platform.OS === 'web')
        body.append('file', await (await fetch(selected.uri)).blob(), name);
      else
        body.append('file', {
          uri: selected.uri,
          name,
          type: selected.mimeType || (video ? 'video/mp4' : 'image/jpeg'),
        } as unknown as Blob);
      body.append('caption', caption);
      const saved = await apiRequest<JobMedia>(`/media/${jobId}`, { token, method: 'POST', body });
      if (mounted.current) {
        setItems((current) => [saved, ...current]);
        setSelected(null);
        setCaption('');
        setUploadExpanded(false);
        setMessage('Opgeslagen bij deze klus.');
      }
    } catch {
      if (mounted.current)
        setError(
          'Upload mislukt. Controleer je verbinding en het bestandsformaat; je selectie blijft staan.'
        );
    } finally {
      uploading.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  if (isLoading) return <ActivityIndicator />;
  if (!user) return <Redirect href="/login" />;
  const job = jobs.find((item) => item.id === jobId);
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[galleryStyles.compactButton, { opacity: disabled ? 0.5 : 1, marginVertical: 3 }]}
    >
      <Text style={galleryStyles.buttonText}>{label}</Text>
    </Pressable>
  );

  return (
    <SapphireScreen title="Foto’s & video’s">
      <MediaViewer item={viewing} onClose={() => setViewing(null)} />
      <Text style={s.muted}>Beelden per klus, inclusief foto’s uit de inmetingen.</Text>
      {jobsError && (
        <>
          <Text accessibilityRole="alert" style={s.text}>
            {jobsError}
          </Text>
          {button('Klussen opnieuw laden', () => setJobsRevision((v) => v + 1))}
        </>
      )}
      {!jobId ? (
        <>
          <TextInput
            accessibilityLabel="Klus zoeken"
            placeholder="Klus zoeken…"
            placeholderTextColor={sapphire.muted}
            value={search}
            onChangeText={setSearch}
            style={{
              color: sapphire.text,
              borderColor: sapphire.edge,
              borderWidth: 1,
              padding: 14,
              marginVertical: 12,
            }}
          />
          {jobsLoading && <ActivityIndicator color={sapphire.blue} />}
          {!jobsLoading && !jobsError && !jobs.length && (
            <Text style={s.text}>Er zijn nog geen klussen.</Text>
          )}
          {jobs
            .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
            .map((item) => (
              <GlassPanel key={item.id} style={s.card}>
                {button(item.name, () => {
                  setJobId(item.id);
                  setSelected(null);
                  setCaption('');
                  setUploadExpanded(false);
                })}
              </GlassPanel>
            ))}
        </>
      ) : (
        <>
          <Text style={[s.title, { marginTop: 14 }]}>{job?.name || 'Geselecteerde klus'}</Text>
          {button(
            'Andere klus kiezen',
            () => {
              setJobId('');
              setSelected(null);
              setCaption('');
              setUploadExpanded(false);
            },
            busy
          )}
          <View style={galleryStyles.uploadPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Beeld toevoegen"
              accessibilityState={{ expanded: uploadExpanded }}
              onPress={() => setUploadExpanded((value) => !value)}
              style={galleryStyles.uploadHeader}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={galleryStyles.uploadTitle}>Beeld toevoegen</Text>
                <Text style={galleryStyles.uploadHint}>
                  {busy
                    ? 'Bezig met uploaden…'
                    : selected
                      ? 'Bestand geselecteerd'
                      : 'Foto tot 15 MB · video tot 50 MB'}
                </Text>
              </View>
              <Feather
                name={uploadExpanded ? 'chevron-up' : 'chevron-down'}
                size={19}
                color={sapphire.blue}
              />
            </Pressable>
            {uploadExpanded && (
              <View style={galleryStyles.uploadBody}>
                <View style={galleryStyles.uploadActions}>
                  <View style={{ flexGrow: 1, flexBasis: 120 }}>
                    {button('Galerij', () => void pick(false), busy)}
                  </View>
                  <View style={{ flexGrow: 1, flexBasis: 120 }}>
                    {button('Camera', () => void pick(true), busy)}
                  </View>
                </View>
                {selected && (
                  <>
                    <Text numberOfLines={2} style={s.text}>
                      {selected.fileName ||
                        (selected.type === 'video' ? 'Video geselecteerd' : 'Foto geselecteerd')}
                    </Text>
                    {selected.type !== 'video' && (
                      <Image
                        source={{ uri: selected.uri }}
                        accessibilityLabel="Geselecteerde foto"
                        style={{ height: 150, width: '100%', resizeMode: 'contain' }}
                      />
                    )}
                    <TextInput
                      accessibilityLabel="Beschrijving"
                      placeholder="Beschrijving (optioneel)"
                      placeholderTextColor={sapphire.muted}
                      value={caption}
                      maxLength={1000}
                      editable={!busy}
                      onChangeText={setCaption}
                      style={galleryStyles.input}
                    />
                    {button(
                      busy ? 'Bezig met uploaden…' : 'Opslaan bij deze klus',
                      () => void upload(),
                      busy
                    )}
                    {button('Selectie wissen', () => setSelected(null), busy)}
                  </>
                )}
              </View>
            )}
          </View>
          {message && (
            <Text accessibilityRole="alert" style={s.text}>
              {message}
            </Text>
          )}
          {error && (
            <Text accessibilityRole="alert" style={s.text}>
              {error}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['all', 'Alles'],
                ['photo', 'Foto’s'],
                ['video', 'Video’s'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === value }}
                onPress={() => setKind(value)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: kind === value ? sapphire.blue : 'transparent',
                }}
              >
                <Text style={galleryStyles.buttonText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {button('Vernieuwen', () => setRevision((v) => v + 1), busy || loading)}
          {loading ? (
            <ActivityIndicator color={sapphire.blue} />
          ) : !error && !items.filter((item) => kind === 'all' || item.kind === kind).length ? (
            <Text style={s.muted}>Nog geen beelden in deze selectie.</Text>
          ) : null}
          <View style={galleryStyles.grid}>
            {items
              .filter((item) => kind === 'all' || item.kind === kind)
              .map((item) => {
                const url = safeMediaUrl(item.url);
                return (
                  <Pressable
                    key={`${item.kind}-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.kind === 'video' ? 'Video' : 'Foto'} openen: ${item.caption || item.filename}`}
                    disabled={!url}
                    onPress={() => setViewing(item)}
                    style={({ pressed }) => [galleryStyles.tile, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={galleryStyles.meta}>
                      <Text style={galleryStyles.kind}>
                        {item.kind === 'video' ? 'VIDEO' : 'FOTO'}
                      </Text>
                      <Text style={galleryStyles.date}>
                        {new Date(item.createdAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={galleryStyles.thumbnail}>
                      {item.kind === 'photo' && url ? (
                        <Image
                          source={{ uri: url }}
                          style={galleryStyles.image}
                          accessibilityLabel={item.caption || 'Klusfoto'}
                        />
                      ) : (
                        <VideoThumbnail url={item.url} retryKey={revision} />
                      )}
                    </View>
                    <View style={galleryStyles.caption}>
                      <Text numberOfLines={2} style={galleryStyles.title}>
                        {item.caption || item.filename}
                      </Text>
                      <Feather name="arrow-up-right" size={16} color={sapphire.blue} />
                    </View>
                    {!url && <Text style={s.muted}>Beeldadres niet beschikbaar.</Text>}
                  </Pressable>
                );
              })}
          </View>
        </>
      )}
    </SapphireScreen>
  );
}

const galleryStyles = StyleSheet.create({
  compactButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: sapphire.glass,
    borderWidth: 1,
    borderColor: sapphire.inner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: sapphire.text, fontSize: 14, fontWeight: '500' },
  uploadPanel: {
    marginVertical: 14,
    borderWidth: 1,
    borderColor: sapphire.inner,
    backgroundColor: sapphire.glass,
  },
  uploadHeader: { minHeight: 64, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  uploadTitle: { color: sapphire.text, fontSize: 15, fontWeight: '500' },
  uploadHint: { color: sapphire.muted, fontSize: 11 },
  uploadBody: { borderTopWidth: 1, borderTopColor: sapphire.inner, padding: 12, gap: 8 },
  uploadActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    color: sapphire.text,
    borderColor: sapphire.inner,
    borderWidth: 1,
    padding: 12,
    minHeight: 44,
    fontSize: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: sapphire.glass,
    borderWidth: 1,
    borderColor: sapphire.inner,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    padding: 9,
  },
  kind: { color: sapphire.muted, fontSize: 10, letterSpacing: 1 },
  date: { color: sapphire.muted, fontSize: 11 },
  thumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: sapphire.background,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  caption: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 6, minHeight: 58 },
  title: { flex: 1, color: sapphire.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
});
