import type { User, UserRole } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapUserRow, type UserRow } from '../db/rows';
import { hashPassword } from './authService';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export class EmailInUseError extends Error {
  constructor() {
    super('A user with this email already exists');
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
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (company_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [companyId, input.email, passwordHash, input.name, input.role]
    );
    return mapUserRow(result.rows[0]);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new EmailInUseError();
    }
    throw err;
  }
};
