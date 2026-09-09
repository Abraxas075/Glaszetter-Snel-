import type { Invoice, InvoiceLine, InvoiceStatus } from '@glaszetter/shared';
import { apiRequest, fetchBlob } from './api';

export interface InvoiceInput {
  jobId: string;
  status?: InvoiceStatus;
  vatRate?: number;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceLineInput {
  elementId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

export const listInvoices = (filters: { jobId?: string } = {}): Promise<Invoice[]> => {
  const params = new URLSearchParams();
  if (filters.jobId) params.set('jobId', filters.jobId);
  return apiRequest<Invoice[]>(`/invoices?${params.toString()}`);
};

export const getInvoice = (id: string): Promise<Invoice> => apiRequest<Invoice>(`/invoices/${id}`);

export const createInvoice = (input: InvoiceInput): Promise<Invoice> =>
  apiRequest<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(input) });

export const updateInvoice = (id: string, input: Partial<InvoiceInput>): Promise<Invoice> =>
  apiRequest<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const addInvoiceLine = (invoiceId: string, input: InvoiceLineInput): Promise<InvoiceLine> =>
  apiRequest<InvoiceLine>(`/invoices/${invoiceId}/lines`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const deleteInvoiceLine = (invoiceId: string, lineId: string): Promise<void> =>
  apiRequest<void>(`/invoices/${invoiceId}/lines/${lineId}`, { method: 'DELETE' });

export const downloadInvoicePdf = (id: string): Promise<Blob> => fetchBlob(`/invoices/${id}/pdf`);
