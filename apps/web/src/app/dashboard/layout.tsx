'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <main style={styles.loading}>Laden...</main>;
  }

  return (
    <div style={styles.shell}>
      <Sidebar />
      <div style={styles.main}>
        <header style={styles.header}>
          <p style={styles.welcome}>Welkom, {user.name}</p>
          <button style={styles.logoutButton} onClick={logout}>
            Uitloggen
          </button>
        </header>
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-background)',
    padding: 'var(--spacing-xl)',
  },
  shell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-background)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
    padding: 'var(--spacing-lg) var(--spacing-xl)',
    borderBottom: '1px solid var(--color-border)',
  },
  welcome: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  logoutButton: {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-background)',
    fontSize: 14,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    padding: 'var(--spacing-xl)',
  },
};
