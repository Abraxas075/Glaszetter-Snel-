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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
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
