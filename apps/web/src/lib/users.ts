import type { User, UserRole } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const listUsers = (): Promise<User[]> => apiRequest<User[]>('/users');

export const createUser = (input: CreateUserInput): Promise<User> =>
  apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(input) });
