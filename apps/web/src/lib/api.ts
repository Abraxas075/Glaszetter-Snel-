import type { ApiResponse } from '@glaszetter/shared';
import { getToken } from './tokenStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {}
): Promise<T> => {
  const { authenticated = true, headers, ...rest } = options;
  const token = authenticated ? getToken() : null;
  const requestHeaders = new Headers(headers);
  if (!(rest.body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new ApiError(
      body.error?.message ?? 'Unknown error',
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR'
    );
  }

  return body.data as T;
};

export const fetchBlob = async (path: string): Promise<Blob> => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new ApiError('Downloaden is mislukt', response.status, 'DOWNLOAD_FAILED');
  }
  return response.blob();
};
