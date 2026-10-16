import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';

export interface OwnerTarget { userId: string; companyId: string; email: string; }
export class RecoveryError extends Error {}
export function validateNewPassword(password: string): void {
  if (password.length < 16 || Buffer.byteLength(password, 'utf8') > 72 || /[\r\n\0]/.test(password)) {
    throw new RecoveryError('Gebruik minstens 16 tekens en maximaal 72 UTF-8-bytes, zonder regeleinden of NUL.');
  }
}
export function parseRecoveryTarget(args: string[]): OwnerTarget {
  const values = new Map<string,string>();
  for (let i=0;i<args.length;i+=2) {
    const key=args[i], value=args[i+1];
    if (!['--user-id','--company-id','--email'].includes(key) || !value || values.has(key)) {
      throw new RecoveryError('Geef uitsluitend --user-id, --company-id en --email op. Een wachtwoord hoort nooit in de opdrachtregel.');
    }
    values.set(key,value);
  }
  const userId=values.get('--user-id') || '', companyId=values.get('--company-id') || '', email=(values.get('--email') || '').trim().toLowerCase();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(userId) || !uuid.test(companyId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RecoveryError('Gebruiker-ID, bedrijf-ID en e-mailadres zijn verplicht en moeten geldig zijn.');
  }
  return {userId,companyId,email};
}
export async function inspectOwner(pool: Pool, target: OwnerTarget): Promise<string> {
  const result=await pool.query<{company_name:string}>(
    `SELECT c.name AS company_name FROM users u JOIN companies c ON c.id=u.company_id
     WHERE u.id=$1 AND u.company_id=$2 AND lower(u.email)=$3 AND u.role='owner'`,
    [target.userId,target.companyId,target.email]);
  if (result.rowCount!==1) throw new RecoveryError('Geen exact passend bestaand beheeraccount gevonden. Niets gewijzigd.');
  return result.rows[0].company_name;
}
/** Administrative recovery only. Never called by HTTP routes, startup, migrations or seed. */
export async function recoverOwner(pool: Pool, target: OwnerTarget, password: string): Promise<void> {
  validateNewPassword(password);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query<{password_hash:string}>(
      `SELECT password_hash FROM users WHERE id=$1 AND company_id=$2 AND lower(email)=$3 AND role='owner' FOR UPDATE`,
      [target.userId,target.companyId,target.email]);
    if (found.rowCount!==1) throw new RecoveryError('Het doelaccount komt niet exact overeen. Niets gewijzigd.');
    if (await bcrypt.compare(password,found.rows[0].password_hash)) throw new RecoveryError('Kies een ander wachtwoord dan het huidige. Niets gewijzigd.');
    const hash=await bcrypt.hash(password,10);
    const changed=await client.query(
      `UPDATE users SET password_hash=$4, updated_at=now()
       WHERE id=$1 AND company_id=$2 AND lower(email)=$3 AND role='owner' RETURNING id`,
      [target.userId,target.companyId,target.email,hash]);
    if (changed.rowCount!==1) throw new RecoveryError('Herstel niet uitgevoerd.');
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
