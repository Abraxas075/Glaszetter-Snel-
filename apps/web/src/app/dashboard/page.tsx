'use client';

import { useEffect, useState } from 'react';
import { listCustomers } from '../../lib/customers';
import { listProjects } from '../../lib/projects';
import { listJobs } from '../../lib/jobs';
import Link from 'next/link';
import type { Route } from 'next';

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
    { href: '/dashboard/customers', label: 'Klanten', value: counts.customers },
    { href: '/dashboard/projects', label: 'Projecten', value: counts.projects },
    { href: '/dashboard/jobs', label: 'Klussen', value: counts.jobs },
  ];

  return (
    <div>
      <h1 className="sapphire-title">Dashboard</h1>
      <div className="overview-grid">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href as Route} className="glass-panel overview-tile">
            <p style={styles.tileValue}>{tile.value ?? '—'}</p>
            <p style={styles.tileLabel}>{tile.label}</p>
          </Link>
        ))}
        <Link href={'/dashboard/spoed' as Route} className="glass-panel overview-tile urgent-frame"><p style={{ ...styles.tileValue, color: '#ff2339' }}>!</p><p style={styles.tileLabel}>Spoedmeldingen</p></Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
