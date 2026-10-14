import { randomBytes } from 'node:crypto';
import { pool } from '../db/pool';
import { hashPassword } from './authService';
import { normalizeUsername } from './username';
export interface EmployeeInput { name: string; username: string; }
export class EmployeeConflictError extends Error {}
export function validateEmployees(value: unknown): value is EmployeeInput[] {
  if (!Array.isArray(value) || !value.length || value.length > 20) return false;
  const usernames = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120) return false;
    const username = normalizeUsername(item.username);
    if (!username || usernames.has(username)) return false;
    usernames.add(username);
  }
  return true;
}
export async function createEmployeeBatch(companyId: string, employees: EmployeeInput[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('employee-username-batch'))");
    const accounts: { id: string; name: string; username: string; created: boolean; password?: string }[] = [];
    for (const input of employees) {
      const username = normalizeUsername(input.username)!;
      const named = await client.query('SELECT id,company_id,name,username FROM users WHERE username=$1 OR (company_id=$2 AND lower(btrim(name))=lower($3))', [username, companyId, input.name.trim()]);
      if (named.rows.length) {
        const user = named.rows[0];
        if (named.rows.length !== 1 || user.company_id !== companyId || user.name.trim().toLowerCase() !== input.name.trim().toLowerCase() || (user.username && user.username !== username)) throw new EmployeeConflictError(`De gebruikersnaam of naam ${input.name.trim()} is al gekoppeld aan een ander account.`);
        if (!user.username) await client.query('UPDATE users SET username=$1,updated_at=now() WHERE id=$2 AND company_id=$3', [username, user.id, companyId]);
        accounts.push({ id: user.id, name: user.name, username, created: false }); continue;
      }
      const password = randomBytes(18).toString('base64url');
      const result = await client.query("INSERT INTO users (company_id,email,username,password_hash,name,role) VALUES ($1,NULL,$2,$3,$4,'glaszetter') RETURNING id,name", [companyId, username, await hashPassword(password), input.name.trim()]);
      accounts.push({ id: result.rows[0].id, name: result.rows[0].name, username, created: true, password });
    }
    await client.query('COMMIT'); return accounts;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
