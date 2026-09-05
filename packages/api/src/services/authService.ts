import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { mapUserRow, type UserRow } from '../db/rows';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: UserRole;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const findUserByEmail = async (
  email: string
): Promise<{ user: User; passwordHash: string } | null> => {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { user: mapUserRow(row), passwordHash: row.password_hash };
};

export const findUserById = async (userId: string): Promise<User | null> => {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  const row = result.rows[0];
  return row ? mapUserRow(row) : null;
};

export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const found = await findUserByEmail(email);
  if (!found) {
    throw new InvalidCredentialsError();
  }

  const isValid = await bcrypt.compare(password, found.passwordHash);
  if (!isValid) {
    throw new InvalidCredentialsError();
  }

  const token = signToken({
    userId: found.user.id,
    companyId: found.user.companyId,
    role: found.user.role,
  });

  return { user: found.user, token };
};

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
};
