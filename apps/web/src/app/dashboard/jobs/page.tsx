'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Job, Project } from '@glaszetter/shared';
import { listProjects } from '../../../lib/projects';
import { createJob, listJobs } from '../../../lib/jobs';
import { ApiError } from '../../../lib/api';
import { JOB_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    listJobs()
      .then((result) => setJobs(result.data))
      .catch(() => setError('Kon klussen niet laden.'));
  };

  useEffect(() => {
    load();
    listProjects()
      .then((result) => setProjects(result.data))
      .catch(() => {});
  }, []);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !projectId) {
      setFormError('Naam en project zijn verplicht.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createJob({ name: name.trim(), projectId });
      setName('');
      setProjectId('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={pageStyles.headerRow}>
        <h1 style={pageStyles.title}>Klussen</h1>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuwe klus'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="name">
            Naam
          </label>
          <input
            id="name"
            style={formStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ramen plaatsen"
          />

          <label style={formStyles.label} htmlFor="project">
            Project
          </label>
          <select
            id="project"
            style={formStyles.select}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Kies een project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {error && <p style={pageStyles.error}>{error}</p>}

      {!error && jobs === null && <p style={pageStyles.empty}>Laden...</p>}

      {!error && jobs !== null && jobs.length === 0 && (
        <p style={pageStyles.empty}>Nog geen klussen aangemaakt.</p>
      )}

      {jobs && jobs.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Naam</th>
              <th style={pageStyles.th}>Project</th>
              <th style={pageStyles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/jobs/${job.id}` as Route} style={pageStyles.tdLink}>
                    {job.name}
                  </Link>
                </td>
                <td style={pageStyles.td}>{projectName(job.projectId)}</td>
                <td style={pageStyles.td}>{JOB_STATUS_LABELS[job.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
