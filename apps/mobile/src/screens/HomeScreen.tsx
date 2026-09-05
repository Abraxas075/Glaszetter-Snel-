import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../constants/colors';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Glaszetter Snel</Text>
        <Text style={styles.subtitle}>Meer dan glaswerk, een heldere werkwijze.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welkom{user ? `, ${user.name}` : ''}</Text>
          <Text style={styles.sectionText}>
            Dit is het startscherm van Glaszetter Snel. Hier begin je je werkdag.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Start Inmeten" onPress={() => router.push('/jobs')} variant="primary" />
          <Button label="Mijn Klussen" onPress={() => {}} variant="secondary" />
          <Button label="Uitloggen" onPress={() => void logout()} variant="danger" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.background,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
  },
});
