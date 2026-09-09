import type { ApiResponse } from '@glaszetter/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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
  options: RequestInit & { token?: string | null } = {}
): Promise<T> => {
  const { token, headers, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      // Let fetch set the multipart boundary itself for FormData bodies.
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
