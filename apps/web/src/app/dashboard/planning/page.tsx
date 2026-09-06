'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Job, Project, Team } from '@glaszetter/shared';
import { listJobs } from '../../../lib/jobs';
import { listTeams } from '../../../lib/teams';
import { listProjects } from '../../../lib/projects';
import { pageStyles } from '../../../styles/shared';

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // maandag = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const formatDayLabel = (date: Date): string =>
  `${DAY_LABELS[(date.getDay() + 6) % 7]} ${date.getDate()}/${date.getMonth() + 1}`;

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [teams, setTeams] = useState<Team[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  useEffect(() => {
    listTeams()
      .then(setTeams)
      .catch(() => setError('Kon teams niet laden.'));
    listProjects()
      .then((result) => setProjects(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    listJobs(100, {
      scheduledFrom: toDateKey(weekStart),
      scheduledTo: toDateKey(weekEnd),
    })
      .then((result) => setJobs(result.data))
      .catch(() => setError('Kon klussen niet laden.'));
  }, [weekStart]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  const jobsFor = (teamId: string, day: Date) =>
    jobs.filter(
      (job) =>
        job.teamId === teamId &&
        job.scheduledDate &&
        toDateKey(new Date(job.scheduledDate)) === toDateKey(day)
    );

  return (
    <div>
      <div style={pageStyles.headerRow}>
        <h1 style={pageStyles.title}>Planning</h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button style={navButtonStyle} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Vorige week
          </button>
          <button style={navButtonStyle} onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Deze week
          </button>
          <button style={navButtonStyle} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Volgende week →
          </button>
        </div>
      </div>

      {error && <p style={pageStyles.error}>{error}</p>}

      {teams.length === 0 && (
        <p style={pageStyles.empty}>
          Nog geen teams aangemaakt. Ga naar Team om een team aan te maken.
        </p>
      )}

      {teams.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={boardTableStyle}>
            <thead>
              <tr>
                <th style={boardHeaderStyle}>Team</th>
                {weekDays.map((day) => (
                  <th key={toDateKey(day)} style={boardHeaderStyle}>
                    {formatDayLabel(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td style={teamCellStyle}>
                    <span style={{ ...colorDotStyle, backgroundColor: team.color ?? '#999' }} />
                    {team.name}
                  </td>
                  {weekDays.map((day) => (
                    <td key={toDateKey(day)} style={dayCellStyle}>
                      {jobsFor(team.id, day).map((job) => (
                        <Link
                          key={job.id}
                          href={`/dashboard/jobs/${job.id}` as Route}
                          style={{ ...jobBlockStyle, backgroundColor: team.color ?? 'var(--color-primary)' }}
                        >
                          <div style={{ fontWeight: 700 }}>{job.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>
                            {projectName(job.projectId)}
                          </div>
                        </Link>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontWeight: 600,
};

const boardTableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  minWidth: 900,
};

const boardHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--spacing-sm)',
  borderBottom: '2px solid var(--color-border)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  textTransform: 'uppercase',
};

const teamCellStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm)',
  borderBottom: '1px solid var(--color-border)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const dayCellStyle: React.CSSProperties = {
  padding: 'var(--spacing-xs)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'top',
  minWidth: 120,
};

const jobBlockStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-background)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  marginBottom: 4,
  fontSize: 12,
};

const colorDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
  marginRight: 6,
};
