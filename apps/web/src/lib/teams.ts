import type { Team } from '@glaszetter/shared';
import { apiRequest } from './api';

export interface TeamInput {
  name: string;
  color?: string;
  memberIds?: string[];
}

export const listTeams = (): Promise<Team[]> => apiRequest<Team[]>('/teams');

export const createTeam = (input: TeamInput): Promise<Team> =>
  apiRequest<Team>('/teams', { method: 'POST', body: JSON.stringify(input) });

export const updateTeam = (id: string, input: Partial<TeamInput>): Promise<Team> =>
  apiRequest<Team>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteTeam = (id: string): Promise<void> =>
  apiRequest<void>(`/teams/${id}`, { method: 'DELETE' });
