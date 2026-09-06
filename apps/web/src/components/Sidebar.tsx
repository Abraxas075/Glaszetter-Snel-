'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/customers', label: 'Klanten' },
  { href: '/dashboard/projects', label: 'Projecten' },
  { href: '/dashboard/jobs', label: 'Klussen' },
  { href: '/dashboard/planning', label: 'Planning' },
];

const ADMIN_NAV_ITEMS = [{ href: '/dashboard/team', label: 'Team' }];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems =
    user?.role === 'owner' || user?.role === 'admin'
      ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : NAV_ITEMS;

  return (
    <nav style={styles.sidebar}>
      <div style={styles.logo}>Glaszetter Snel</div>
      <ul style={styles.list}>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href as Route}
                style={{ ...styles.link, ...(isActive ? styles.linkActive : {}) }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    backgroundColor: 'var(--color-secondary)',
    padding: 'var(--spacing-lg)',
    flexShrink: 0,
  },
  logo: {
    color: 'var(--color-background)',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 'var(--spacing-xxl)',
    paddingLeft: 'var(--spacing-sm)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  link: {
    display: 'block',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    color: '#EAF3FF',
    fontSize: 14,
    fontWeight: 500,
  },
  linkActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-background)',
  },
};
