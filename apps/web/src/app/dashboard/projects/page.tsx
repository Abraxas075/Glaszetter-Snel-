'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Customer, Project } from '@glaszetter/shared';
import { listCustomers } from '../../../lib/customers';
import { createProject, listProjects } from '../../../lib/projects';
import { ApiError } from '../../../lib/api';
import { PROJECT_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    listProjects()
      .then((result) => setProjects(result.data))
      .catch(() => setError('Kon projecten niet laden.'));
  };

  useEffect(() => {
    load();
    listCustomers()
      .then((result) => setCustomers(result.data))
      .catch(() => {});
  }, []);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? '—';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !customerId) {
      setFormError('Naam en klant zijn verplicht.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProject({ name: name.trim(), customerId, city: city.trim() || undefined });
      setName('');
      setCustomerId('');
      setCity('');
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
        <h1 style={pageStyles.title}>Projecten</h1>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuw project'}
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
            placeholder="Renovatie Kerkstraat 12"
          />

          <label style={formStyles.label} htmlFor="customer">
            Klant
          </label>
          <select
            id="customer"
            style={formStyles.select}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Kies een klant...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label style={formStyles.label} htmlFor="city">
            Plaats
          </label>
          <input
            id="city"
            style={formStyles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Utrecht"
          />

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {error && <p style={pageStyles.error}>{error}</p>}

      {!error && projects === null && <p style={pageStyles.empty}>Laden...</p>}

      {!error && projects !== null && projects.length === 0 && (
        <p style={pageStyles.empty}>Nog geen projecten aangemaakt.</p>
      )}

      {projects && projects.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Naam</th>
              <th style={pageStyles.th}>Klant</th>
              <th style={pageStyles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/projects/${project.id}` as Route} style={pageStyles.tdLink}>
                    {project.name}
                  </Link>
                </td>
                <td style={pageStyles.td}>{customerName(project.customerId)}</td>
                <td style={pageStyles.td}>{PROJECT_STATUS_LABELS[project.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
