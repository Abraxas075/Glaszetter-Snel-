'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Invoice, Job } from '@glaszetter/shared';
import { listJobs } from '../../../lib/jobs';
import { createInvoice, listInvoices } from '../../../lib/invoices';
import { ApiError } from '../../../lib/api';
import { INVOICE_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';

const formatCurrency = (amount: number): string =>
  `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [jobId, setJobId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError('Kon facturen niet laden.'));
  };

  useEffect(() => {
    load();
    listJobs().then((result) => setJobs(result.data)).catch(() => {});
  }, []);

  const jobName = (id: string) => jobs.find((j) => j.id === id)?.name ?? '—';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!jobId) {
      setFormError('Kies een klus.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoice({ jobId, dueDate: dueDate || undefined });
      setJobId('');
      setDueDate('');
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
        <h1 style={pageStyles.title}>Facturen</h1>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuwe factuur'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="job">
            Klus
          </label>
          <select id="job" style={formStyles.select} value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Kies een klus...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>

          <label style={formStyles.label} htmlFor="dueDate">
            Vervaldatum
          </label>
          <input
            id="dueDate"
            type="date"
            style={formStyles.input}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {error && <p style={pageStyles.error}>{error}</p>}

      {!error && invoices === null && <p style={pageStyles.empty}>Laden...</p>}

      {!error && invoices !== null && invoices.length === 0 && (
        <p style={pageStyles.empty}>Nog geen facturen aangemaakt.</p>
      )}

      {invoices && invoices.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Nummer</th>
              <th style={pageStyles.th}>Klus</th>
              <th style={pageStyles.th}>Status</th>
              <th style={pageStyles.th}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/invoices/${invoice.id}` as Route} style={pageStyles.tdLink}>
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td style={pageStyles.td}>{jobName(invoice.jobId)}</td>
                <td style={pageStyles.td}>{INVOICE_STATUS_LABELS[invoice.status]}</td>
                <td style={pageStyles.td}>{formatCurrency(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
