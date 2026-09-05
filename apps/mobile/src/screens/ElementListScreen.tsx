import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import type { Element } from '@glaszetter/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { listElements } from '../api/elements';
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

  const load = useCallback(() => {
    if (!token) return;
    listElements(token, jobId)
      .then((result) => setElements(result.data))
      .catch(() => setError('Kon elementen niet laden.'));
  }, [token, jobId]);

  useEffect(load, [load]);
  useFocusEffect(load);

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
    padding: spacing.xl,
    color: colors.error,
  },
});
