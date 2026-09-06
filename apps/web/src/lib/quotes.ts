import type { Quote, QuoteLine, QuoteStatus } from '@glaszetter/shared';
import { apiRequest, fetchBlob } from './api';

export interface QuoteInput {
  jobId: string;
  status?: QuoteStatus;
  vatRate?: number;
  validUntil?: string;
  notes?: string;
}

export interface QuoteLineInput {
  elementId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

export const listQuotes = (filters: { jobId?: string } = {}): Promise<Quote[]> => {
  const params = new URLSearchParams();
  if (filters.jobId) params.set('jobId', filters.jobId);
  return apiRequest<Quote[]>(`/quotes?${params.toString()}`);
};

export const getQuote = (id: string): Promise<Quote> => apiRequest<Quote>(`/quotes/${id}`);

export const createQuote = (input: QuoteInput): Promise<Quote> =>
  apiRequest<Quote>('/quotes', { method: 'POST', body: JSON.stringify(input) });

export const updateQuote = (id: string, input: Partial<QuoteInput>): Promise<Quote> =>
  apiRequest<Quote>(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const addQuoteLine = (quoteId: string, input: QuoteLineInput): Promise<QuoteLine> =>
  apiRequest<QuoteLine>(`/quotes/${quoteId}/lines`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const deleteQuoteLine = (quoteId: string, lineId: string): Promise<void> =>
  apiRequest<void>(`/quotes/${quoteId}/lines/${lineId}`, { method: 'DELETE' });

export const convertQuoteToInvoice = (quoteId: string): Promise<{ invoiceId: string }> =>
  apiRequest<{ invoiceId: string }>(`/quotes/${quoteId}/convert-to-invoice`, { method: 'POST' });

export const downloadQuotePdf = (id: string): Promise<Blob> => fetchBlob(`/quotes/${id}/pdf`);
