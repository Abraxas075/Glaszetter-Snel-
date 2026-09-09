'use client';

import { useEffect, useState } from 'react';
import type { Customer } from '@glaszetter/shared';
import { listCustomers } from '../../../lib/customers';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCustomers()
      .then((result) => setCustomers(result.data))
      .catch(() => setError('Kon klanten niet laden.'));
  }, []);

  return (
    <div>
      <h1 style={styles.title}>Klanten</h1>

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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--spacing-xl)',
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
