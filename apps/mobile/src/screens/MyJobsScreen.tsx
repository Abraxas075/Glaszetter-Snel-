import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { Job } from '@glaszetter/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { listMyJobs } from '../api/jobs';
import { spacing } from '../constants/colors';
import { sapphire } from '../constants/sapphire';
import { SafeAreaView } from 'react-native-safe-area-context';
const colors = {
  background: sapphire.background,
  surface: sapphire.glass,
  border: sapphire.edge,
  primary: sapphire.blue,
  textPrimary: sapphire.text,
  textSecondary: sapphire.muted,
  error: '#FF6472',
};

const formatDate = (date?: Date): string => {
  if (!date) return 'Nog niet ingepland';
  return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
};

export const MyJobsScreen: React.FC = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) return;
      setError(null);
      setJobs(null);

      listMyJobs(token)
        .then((result) => {
          const sorted = [...result.data].sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
          });
          if (active) setJobs(sorted);
        })
        .catch(() => {
          if (active) setError('Kon klussen niet laden.');
        });
      return () => {
        active = false;
      };
    }, [token])
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mijn Klussen</Text>
        <Text style={styles.subtitle}>Klussen ingepland voor jouw team</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!error && jobs === null && (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      )}

      {!error && jobs !== null && jobs.length === 0 && (
        <Text style={styles.empty}>Je hebt nog geen ingeplande klussen.</Text>
      )}

      {jobs && jobs.length > 0 && (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.jobCard}
              onPress={() => router.push(`/jobs/${item.id}/elements`)}
            >
              <Text style={styles.jobName}>{item.name}</Text>
              <Text style={styles.jobDate}>{formatDate(item.scheduledDate)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  jobDate: {
    fontSize: 13,
    color: colors.textSecondary,
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
