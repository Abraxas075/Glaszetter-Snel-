'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer, PaginatedResponse } from '@glaszetter/shared';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    apiRequest<PaginatedResponse<Customer>>('/customers')
      .then((result) => setCustomers(result.data))
      .catch(() => setError('Kon klanten niet laden.'));
  }, [user]);

  if (authLoading || !user) {
    return <main style={styles.page}>Laden...</main>;
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Glaszetter Snel</h1>
          <p style={styles.subtitle}>Welkom, {user.name}</p>
        </div>
        <button style={styles.logoutButton} onClick={logout}>
          Uitloggen
        </button>
      </header>

      <section style={styles.content}>
        <h2 style={styles.sectionTitle}>Klanten</h2>

        {error && <p style={styles.error}>{error}</p>}

        {!error && customers === null && <p style={styles.empty}>Laden...</p>}

        {!error && customers !== null && customers.length === 0 && (
          <p style={styles.empty}>Nog geen klanten toegevoegd.</p>
        )}

        {customers && customers.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Naam</th>
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Plaats</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td style={styles.td}>{customer.name}</td>
                  <td style={styles.td}>{customer.email ?? '—'}</td>
                  <td style={styles.td}>{customer.city ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-background)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-primary)',
    padding: 'var(--spacing-xl)',
    color: 'var(--color-background)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    margin: 0,
    marginTop: 4,
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
    padding: 'var(--spacing-xl)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 'var(--spacing-lg)',
    color: 'var(--color-text-primary)',
  },
  empty: {
    color: 'var(--color-text-secondary)',
  },
  error: {
    color: 'var(--color-error)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--spacing-md)',
    borderBottom: '2px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  td: {
    padding: 'var(--spacing-md)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
};
