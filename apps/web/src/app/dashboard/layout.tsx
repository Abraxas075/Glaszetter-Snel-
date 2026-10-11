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
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <header className="dashboard-header">
          <p style={styles.welcome}>Welkom, {user.name}</p>
          <button style={styles.logoutButton} onClick={logout}>
            Uitloggen
          </button>
        </header>
        <main id="main-content" className="dashboard-content">
          {children}
        </main>
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
  welcome: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  logoutButton: {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
    fontSize: 14,
    fontWeight: 600,
  },
};
