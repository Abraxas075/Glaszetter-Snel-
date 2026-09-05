import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { Job } from '@glaszetter/shared';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { listJobs } from '../api/jobs';
import { colors, spacing, radius } from '../constants/colors';

export const JobPickerScreen: React.FC = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    listJobs(token)
      .then((result) => setJobs(result.data))
      .catch(() => setError('Kon klussen niet laden.'));
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Start Inmeten</Text>
        <Text style={styles.subtitle}>Kies een klus om mee te beginnen</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!error && jobs === null && <ActivityIndicator style={styles.loading} color={colors.primary} />}

      {!error && jobs !== null && jobs.length === 0 && (
        <Text style={styles.empty}>Nog geen klussen beschikbaar.</Text>
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
              <Text style={styles.jobStatus}>{item.status}</Text>
            </TouchableOpacity>
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
    borderRadius: radius.md,
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
  jobStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
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
