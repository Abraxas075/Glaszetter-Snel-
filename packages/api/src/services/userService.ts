import { normalizeUsername } from './username';
import type { User, UserRole } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapUserRow, type UserRow } from '../db/rows';
import { hashPassword } from './authService';

export interface CreateUserInput {
  name: string;
  email?: string;
  username?: string;
  password: string;
  role: UserRole;
}

export class EmailInUseError extends Error {
  constructor() {
    super('Dit e-mailadres of deze gebruikersnaam is al in gebruik');
    this.name = 'EmailInUseError';
  }
}

export const listUsers = async (companyId: string): Promise<User[]> => {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE company_id = $1 ORDER BY name ASC',
    [companyId]
  );
  return result.rows.map(mapUserRow);
};

export const createUser = async (
  companyId: string,
  input: CreateUserInput
): Promise<User> => {
  const username = input.username ? normalizeUsername(input.username) : null;
  if (input.username && !username) throw new Error('Ongeldige gebruikersnaam');
  const email = input.email?.trim() || null;
  if (!email && !username) throw new Error('Gebruikersnaam of e-mail is verplicht');
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (company_id, email, password_hash, name, role, username)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [companyId, email, passwordHash, input.name.trim(), input.role, username]
    );
    return mapUserRow(result.rows[0]);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new EmailInUseError();
    }
    throw err;
  }
};
