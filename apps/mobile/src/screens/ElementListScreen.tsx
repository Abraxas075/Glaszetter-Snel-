import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import type { Element, Photo } from '@glaszetter/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { listElements } from '../api/elements';
import { listPhotos, uploadPhoto } from '../api/photos';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '../hooks/usePhotoPicker';
import { Button } from '../components/Button';
import { ELEMENT_TYPE_LABELS } from '../constants/elementTypes';
import { colors, spacing, radius } from '../constants/colors';

interface ElementListScreenProps {
  jobId: string;
}

export const ElementListScreen: React.FC<ElementListScreenProps> = ({ jobId }) => {
  const router = useRouter();
  const { token } = useAuth();
  const [elements, setElements] = useState<Element[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    listElements(token, jobId)
      .then((result) => setElements(result.data))
      .catch(() => setError('Kon elementen niet laden.'));
  }, [token, jobId]);

  const loadPhotos = useCallback(() => {
    if (!token) return;
    listPhotos(token, { jobId })
      .then(setPhotos)
      .catch(() => {});
  }, [token, jobId]);

  useEffect(load, [load]);
  useEffect(loadPhotos, [loadPhotos]);
  useFocusEffect(load);
  useFocusEffect(loadPhotos);

  const handleAddPhoto = async (fromCamera: boolean) => {
    if (!token) return;
    const photo = fromCamera ? await takePhotoWithCamera() : await pickPhotoFromLibrary();
    if (!photo) return;

    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const uploaded = await uploadPhoto(token, photo, { jobId });
      setPhotos((prev) => [uploaded, ...prev]);
    } catch {
      setPhotoError('Foto uploaden is mislukt.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ingemeten elementen</Text>
        <Button
          label="+ Nieuw element"
          onPress={() => router.push(`/jobs/${jobId}/elements/new`)}
          style={styles.newButton}
        />
      </View>

      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>Klusfoto's</Text>
        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.photoActionButton}
            onPress={() => handleAddPhoto(true)}
            disabled={isUploadingPhoto}
          >
            <Text style={styles.photoActionText}>📷 Foto maken</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoActionButton}
            onPress={() => handleAddPhoto(false)}
            disabled={isUploadingPhoto}
          >
            <Text style={styles.photoActionText}>🖼️ Uit galerij</Text>
          </TouchableOpacity>
        </View>

        {isUploadingPhoto && <ActivityIndicator color={colors.primary} style={styles.uploadSpinner} />}
        {photoError && <Text style={styles.error}>{photoError}</Text>}

        {photos.length === 0 && !isUploadingPhoto && (
          <Text style={styles.emptyPhotos}>Nog geen klusfoto's.</Text>
        )}

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.url }}
                style={styles.photoThumb}
                fadeDuration={0}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!error && elements === null && (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      )}

      {!error && elements !== null && elements.length === 0 && (
        <Text style={styles.empty}>Nog geen elementen ingemeten voor deze klus.</Text>
      )}

      {elements && elements.length > 0 && (
        <FlatList
          data={elements}
          keyExtractor={(el) => el.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.type}>{ELEMENT_TYPE_LABELS[item.type]}</Text>
              {item.location && <Text style={styles.location}>{item.location}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  newButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  code: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  type: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  empty: {
    padding: spacing.xl,
    color: colors.textSecondary,
  },
  error: {
    paddingHorizontal: spacing.lg,
    color: colors.error,
  },
  photoSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoActionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  photoActionText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  uploadSpinner: {
    marginTop: spacing.sm,
  },
  emptyPhotos: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoRow: {
    marginTop: spacing.md,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
});
