'use client';

import { useEffect, useState } from 'react';
import { listCustomers } from '../../lib/customers';
import { listProjects } from '../../lib/projects';
import { listJobs } from '../../lib/jobs';

interface Counts {
  customers: number | null;
  projects: number | null;
  jobs: number | null;
}

export default function DashboardOverviewPage() {
  const [counts, setCounts] = useState<Counts>({ customers: null, projects: null, jobs: null });

  useEffect(() => {
    listCustomers(1)
      .then((r) => setCounts((c) => ({ ...c, customers: r.total })))
      .catch(() => {});
    listProjects(1)
      .then((r) => setCounts((c) => ({ ...c, projects: r.total })))
      .catch(() => {});
    listJobs(1)
      .then((r) => setCounts((c) => ({ ...c, jobs: r.total })))
      .catch(() => {});
  }, []);

  const tiles = [
    { label: 'Klanten', value: counts.customers },
    { label: 'Projecten', value: counts.projects },
    { label: 'Klussen', value: counts.jobs },
  ];

  return (
    <div>
      <h1 style={styles.title}>Dashboard</h1>
      <div style={styles.grid}>
        {tiles.map((tile) => (
          <div key={tile.label} style={styles.tile}>
            <p style={styles.tileValue}>{tile.value ?? '—'}</p>
            <p style={styles.tileLabel}>{tile.label}</p>
          </div>
        ))}
      </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--spacing-lg)',
    maxWidth: 600,
  },
  tile: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-xl)',
  },
  tileValue: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--color-primary)',
  },
  tileLabel: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--spacing-xs)',
  },
};
