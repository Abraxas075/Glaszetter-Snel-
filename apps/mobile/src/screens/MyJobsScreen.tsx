import { GoogleMapsActions } from '../components/GoogleMapsActions';
import { useProjectLocations } from '../hooks/useMapLocations';
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
import type { SapphirePalette } from '../constants/sapphire';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatDate = (date?: Date): string => {
  if (!date) return 'Nog niet ingepland';
  return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
};

export const MyJobsScreen: React.FC = () => {
  const sapphire = useSapphire();
  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { token } = useAuth();
  const locations = useProjectLocations();
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
        <ActivityIndicator style={styles.loading} color={sapphire.blue} />
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
            <View style={styles.jobCard}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open klus ${item.name}`} onPress={() => router.push(`/jobs/${item.id}/elements`)} style={{minHeight: 44}}>
              <Text style={styles.jobName}>{item.name}</Text>
              <Text style={styles.jobDate}>{formatDate(item.scheduledDate)}</Text>
              </TouchableOpacity>
              <GoogleMapsActions location={locations.projects.get(item.projectId)} loading={locations.loading} error={locations.error} retry={locations.retry} dark />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (sapphire: SapphirePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sapphire.background,
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: sapphire.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: sapphire.muted,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: sapphire.glass,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: sapphire.edge,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: sapphire.text,
    marginBottom: spacing.xs,
  },
  jobDate: {
    fontSize: 13,
    color: sapphire.muted,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  empty: {
    padding: spacing.xl,
    color: sapphire.muted,
  },
  error: {
    padding: spacing.xl,
    color: sapphire.error,
  },
});
