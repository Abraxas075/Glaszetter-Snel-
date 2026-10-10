import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { Customer, Job, Project } from '@glaszetter/shared';
import { agendaJobs, customerDirectory, projectDirectory } from '../api/dashboard';
import { useAuth } from '../contexts/AuthContext';
import { SapphireScreen, sapphireStyles as s } from '../components/SapphireScreen';
import { GlassPanel } from '../components/GlassPanel';
import { sapphire } from '../constants/sapphire';
import { localDateKey, scheduledDateKey } from '../utils/dayRange';

type Mode = 'agenda' | 'kaart' | 'customers' | 'chat' | 'profile';
const titles: Record<Mode, string> = {
  agenda: 'Agenda',
  kaart: 'Kaart',
  customers: 'Klantgegevens',
  chat: 'Chat',
  profile: 'Profiel',
};
const roles: Record<string, string> = {
  owner: 'Eigenaar',
  planner: 'Planner',
  inmeter: 'Inmeter',
  glaszetter: 'Glaszetter',
  warehouse: 'Magazijn',
  admin: 'Beheerder',
  external: 'Extern',
};
async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Niet geopend', 'Er is geen geschikte app beschikbaar om dit te openen.');
  }
}
export function DashboardScreen({ mode }: { mode: Mode }) {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token || mode === 'chat' || mode === 'profile') return;
      setBusy(true);
      setError(false);
      setJobs([]);
      setCustomers([]);
      setProjects([]);
      const load = async () => {
        if (mode === 'customers') {
          const data = await customerDirectory(token);
          if (active) setCustomers(data);
        } else {
          const data = await agendaJobs(token);
          const projectData = mode === 'kaart' ? await projectDirectory(token) : [];
          if (active) {
            setJobs(data);
            setProjects(projectData);
          }
        }
      };
      void load()
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [mode, token, reload])
  );
  if (isLoading)
    return (
      <SapphireScreen>
        <ActivityIndicator color={sapphire.blue} />
      </SapphireScreen>
    );
  if (!user) return <Redirect href="/login" />;
  const chosen = new Date();
  chosen.setDate(chosen.getDate() + dayOffset);
  const daily = jobs
    .filter(
      (job) => job.scheduledDate && scheduledDateKey(job.scheduledDate) === localDateKey(chosen)
    )
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  const address = (value: { address?: string; city?: string; postalCode?: string }) =>
    [value.address, value.postalCode, value.city].filter(Boolean).join(', ');
  return (
    <SapphireScreen title={titles[mode]}>
      {busy && <ActivityIndicator color={sapphire.blue} />}
      {error && (
        <GlassPanel style={s.card}>
          <Text style={s.text}>Gegevens laden is mislukt.</Text>
          <Pressable
            accessibilityRole="button"
            style={s.action}
            onPress={() => setReload((value) => value + 1)}
          >
            <Text style={s.actionText}>Opnieuw proberen</Text>
          </Pressable>
        </GlassPanel>
      )}
      {mode === 'agenda' && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vorige dag"
              style={[s.action, { flex: 1 }]}
              onPress={() => setDayOffset((value) => value - 1)}
            >
              <Text style={s.actionText}>Vorige</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[s.action, { flex: 1 }]}
              onPress={() => setDayOffset(0)}
            >
              <Text style={s.actionText}>Vandaag</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volgende dag"
              style={[s.action, { flex: 1 }]}
              onPress={() => setDayOffset((value) => value + 1)}
            >
              <Text style={s.actionText}>Volgende</Text>
            </Pressable>
          </View>
          <Text style={[s.title, { marginBottom: 16 }]}>
            {chosen.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {!busy && !error && daily.length === 0 && (
            <Text style={s.muted}>Geen klussen voor jouw team ingepland op deze dag.</Text>
          )}
          {daily.map((job) => (
            <Pressable
              key={job.id}
              accessibilityRole="button"
              onPress={() => router.push(`/jobs/${job.id}/elements`)}
            >
              <GlassPanel style={s.card}>
                <Text style={s.muted}>Ingepland</Text>
                <Text style={s.title}>{job.name}</Text>
              </GlassPanel>
            </Pressable>
          ))}
        </>
      )}
      {mode === 'kaart' && !busy && !error && (
        <>
          <Text style={[s.muted, { marginBottom: 16 }]}>
            Open het klusadres in je kaarten-app om een route te starten.
          </Text>
          {jobs.length === 0 && (
            <Text style={s.muted}>Er zijn nog geen klussen aan jouw team toegewezen.</Text>
          )}
          {jobs.map((job) => {
            const project = projects.find((item) => item.id === job.projectId);
            const destination = project ? address(project) : '';
            return (
              <GlassPanel key={job.id} style={s.card}>
                <Text style={s.title}>{job.name}</Text>
                <Text style={s.muted}>{destination || 'Geen klusadres ingevuld.'}</Text>
                {destination && (
                  <Pressable
                    accessibilityRole="button"
                    style={s.action}
                    onPress={() =>
                      void openLink(
                        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
                      )
                    }
                  >
                    <Text style={s.actionText}>Start route</Text>
                  </Pressable>
                )}
              </GlassPanel>
            );
          })}
        </>
      )}
      {mode === 'customers' && !busy && !error && (
        <>
          {customers.length === 0 && <Text style={s.muted}>Nog geen klanten beschikbaar.</Text>}
          {customers.map((customer) => (
            <GlassPanel key={customer.id} style={s.card}>
              <Text style={s.title}>{customer.name}</Text>
              <Text style={s.muted}>{address(customer) || 'Geen adres ingevuld.'}</Text>
              {customer.phone && (
                <Pressable
                  accessibilityRole="button"
                  style={s.action}
                  onPress={() => void openLink(`tel:${customer.phone!.replace(/[^+0-9]/g, '')}`)}
                >
                  <Text style={s.actionText}>Bellen: {customer.phone}</Text>
                </Pressable>
              )}
              {customer.email && (
                <Pressable
                  accessibilityRole="button"
                  style={s.action}
                  onPress={() => void openLink(`mailto:${customer.email}`)}
                >
                  <Text style={s.actionText}>{customer.email}</Text>
                </Pressable>
              )}
              {address(customer) && (
                <Pressable
                  accessibilityRole="button"
                  style={s.action}
                  onPress={() =>
                    void openLink(
                      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address(customer))}`
                    )
                  }
                >
                  <Text style={s.actionText}>Route</Text>
                </Pressable>
              )}
            </GlassPanel>
          ))}
        </>
      )}
      {mode === 'chat' && (
        <GlassPanel style={s.card}>
          <Text style={s.title}>Chat is nog niet beschikbaar</Text>
          <Text style={s.muted}>
            Berichten versturen en ontvangen wordt in een volgende versie toegevoegd.
          </Text>
        </GlassPanel>
      )}
      {mode === 'profile' && (
        <>
          <GlassPanel style={s.card}>
            <Text style={[s.title, { fontSize: 30 }]}>
              {user.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </Text>
            <Text style={s.title}>{user.name}</Text>
            <Text style={s.muted}>{roles[user.role] || user.role}</Text>
            <Text style={s.text}>{user.email}</Text>
          </GlassPanel>
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            style={[s.action, { backgroundColor: sapphire.red }]}
            onPress={async () => {
              setSigningOut(true);
              try {
                await logout();
                router.replace('/login');
              } catch {
                Alert.alert('Uitloggen mislukt', 'Probeer het opnieuw.');
              } finally {
                setSigningOut(false);
              }
            }}
          >
            <Text style={s.actionText}>{signingOut ? 'Uitloggen…' : 'Uitloggen'}</Text>
          </Pressable>
        </>
      )}
    </SapphireScreen>
  );
}
