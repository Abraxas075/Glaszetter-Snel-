import type { PublicQuoteView } from '@glaszetter/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class PublicQuoteError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'PublicQuoteError';
  }
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new PublicQuoteError(body.error?.message ?? 'Er ging iets mis.', response.status);
  }
  return body.data as T;
};

export const getPublicQuote = (token: string): Promise<PublicQuoteView> =>
  request<PublicQuoteView>(`/public/quotes/${token}`);

export const approvePublicQuote = (token: string): Promise<PublicQuoteView['quote']> =>
  request(`/public/quotes/${token}/approve`, { method: 'POST' });

export const rejectPublicQuote = (
  token: string,
  reason?: string
): Promise<PublicQuoteView['quote']> =>
  request(`/public/quotes/${token}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const getPublicQuotePdfUrl = (token: string): string =>
  `${API_BASE_URL}/public/quotes/${token}/pdf`;
