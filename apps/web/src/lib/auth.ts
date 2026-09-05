import type { User } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface LoginResult {
  user: User;
  token: string;
}

export const login = (email: string, password: string): Promise<LoginResult> =>
  apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email, password }),
  });

export const getMe = (): Promise<{ user: User }> => apiRequest<{ user: User }>('/auth/me');

export { getToken, setToken, clearToken } from './tokenStorage';
