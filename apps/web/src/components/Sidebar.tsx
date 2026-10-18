'use client';

import { useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  },
  {
    href: '/dashboard/customers',
    label: 'Klanten',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  },
  { href: '/dashboard/projects', label: 'Projecten', icon: 'M3 7V4h6l2 3h10v13H3z' },
  {
    href: '/dashboard/jobs',
    label: 'Klussen',
    icon: 'M9 5H4v16h16V5h-5 M9 3h6v4H9z M8 12h8 M8 16h5',
  },
  { href: '/dashboard/chat', label: 'Chat', icon: 'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5z' },
  { href: '/dashboard/media', label: 'Foto’s & video’s', icon: 'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0' },
  { href: '/dashboard/kaart', label: 'Kaart', icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15' },
  { href: '/dashboard/planning', label: 'Planning', icon: 'M3 5h18v16H3z M16 3v4 M8 3v4 M3 11h18' },
  {
    href: '/dashboard/quotes',
    label: 'Offertes',
    icon: 'M14 2H6v20h12V6z M14 2v5h5 M9 12h6 M9 16h6',
  },
  {
    href: '/dashboard/invoices',
    label: 'Facturen',
    icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  },
  { href: '/dashboard/bestellingen', label: 'Bestellingen', icon: 'M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M7 5l10 4' },
  { href: '/dashboard/spoed', label: 'Spoedmeldingen', icon: 'M5 20h14 M7 20v-7a5 5 0 0 1 10 0v7 M12 2v3 M3 7l2 2 M21 7l-2 2' },
];
const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/team', label: 'Team', icon: NAV_ITEMS[1].icon },
  {
    href: '/dashboard/settings',
    label: 'Instellingen',
    icon: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const navItems =
    user?.role === 'owner' || user?.role === 'admin'
      ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : NAV_ITEMS;

  return (
    <nav className="sapphire-sidebar" aria-label="Hoofdnavigatie">
      <div className="sidebar-heading">
        <Link
          href="/dashboard"
          aria-label="Glaszetter Snel: dashboard"
          onClick={() => setExpanded(false)}
        >
          <BrandLogo />
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={expanded}
          aria-controls="main-navigation"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Sluiten' : 'Menu'}
        </button>
      </div>
      <ul id="main-navigation" className={`sidebar-links${expanded ? ' is-expanded' : ''}`}>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href as Route}
                className={`sidebar-link${item.href === '/dashboard/spoed' ? ' urgent-frame' : ''}${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setExpanded(false)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
                <span className="nav-chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
