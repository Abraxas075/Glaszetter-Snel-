import type { User } from '@glaszetter/shared';
import { apiRequest } from './client';

export interface LoginResult {
  user: User;
  token: string;
}

export const login = (email: string, password: string): Promise<LoginResult> =>
  apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = (token: string): Promise<{ user: User }> =>
  apiRequest<{ user: User }>('/auth/me', { token });
