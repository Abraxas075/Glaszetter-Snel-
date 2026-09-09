'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import type { Element, Invoice, InvoiceStatus } from '@glaszetter/shared';
import {
  addInvoiceLine,
  deleteInvoiceLine,
  downloadInvoicePdf,
  getInvoice,
  updateInvoice,
} from '../../../../lib/invoices';
import { listElements } from '../../../../lib/elements';
import { ApiError } from '../../../../lib/api';
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../../styles/shared';
import { LineItemsEditor, type LineItemInput } from '../../../../components/LineItemsEditor';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<InvoiceStatus>('concept');
  const [dueDate, setDueDate] = useState('');
  const [vatRate, setVatRate] = useState('21');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = () => {
    getInvoice(invoiceId)
      .then((inv) => {
        setInvoice(inv);
        setStatus(inv.status);
        setDueDate(inv.dueDate ? String(inv.dueDate).slice(0, 10) : '');
        setVatRate(String(inv.vatRate));
        setNotes(inv.notes ?? '');
        return listElements(inv.jobId);
      })
      .then((result) => setElements(result.data))
      .catch(() => setError('Kon factuur niet laden.'));
  };

  useEffect(load, [invoiceId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateInvoice(invoiceId, {
        status,
        vatRate: parseFloat(vatRate.replace(',', '.')) || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      setInvoice(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const updated = await updateInvoice(invoiceId, { status: 'paid' });
      setInvoice(updated);
      setStatus(updated.status);
    } catch {
      setSaveError('Markeren als betaald is mislukt.');
    }
  };

  const handleAddLine = async (input: LineItemInput) => {
    await addInvoiceLine(invoiceId, input);
    load();
  };

  const handleDeleteLine = async (lineId: string) => {
    await deleteInvoiceLine(invoiceId, lineId);
    load();
  };

  const handleDownloadPdf = async () => {
    const blob = await downloadInvoicePdf(invoiceId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!invoice) return <p style={pageStyles.empty}>Laden...</p>;

  return (
    <div>
      <Link href={'/dashboard/invoices' as Route} style={pageStyles.backLink}>
        ← Terug naar facturen
      </Link>
      <h1 style={pageStyles.title}>{invoice.invoiceNumber}</h1>

      <form onSubmit={handleSave} style={{ ...formStyles.card, marginTop: 'var(--spacing-lg)' }}>
        <label style={formStyles.label} htmlFor="status">
          Status
        </label>
        <select
          id="status"
          style={formStyles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
        >
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
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

        <label style={formStyles.label} htmlFor="vatRate">
          BTW-percentage
        </label>
        <input
          id="vatRate"
          type="number"
          step="0.01"
          style={formStyles.input}
          value={vatRate}
          onChange={(e) => setVatRate(e.target.value)}
        />

        <label style={formStyles.label} htmlFor="notes">
          Notities
        </label>
        <input id="notes" style={formStyles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {saveError && <p style={pageStyles.error}>{saveError}</p>}
        {saved && <p style={{ color: 'var(--color-success)', marginTop: 'var(--spacing-md)' }}>Opgeslagen.</p>}

        <button type="submit" style={formStyles.submitButton} disabled={isSaving}>
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <button type="button" style={pageStyles.primaryButton} onClick={handleDownloadPdf}>
          Download PDF
        </button>
        {invoice.status !== 'paid' && (
          <button type="button" style={pageStyles.primaryButton} onClick={handleMarkPaid}>
            Markeer als betaald
          </button>
        )}
      </div>

      <h2 style={{ ...pageStyles.title, fontSize: 18, marginBottom: 'var(--spacing-md)' }}>Regels</h2>
      <LineItemsEditor
        lines={invoice.lines}
        elements={elements}
        vatRate={invoice.vatRate}
        subtotal={invoice.subtotal}
        vatAmount={invoice.vatAmount}
        total={invoice.total}
        onAddLine={handleAddLine}
        onDeleteLine={handleDeleteLine}
      />
    </div>
  );
}
