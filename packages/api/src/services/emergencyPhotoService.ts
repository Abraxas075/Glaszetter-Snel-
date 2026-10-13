import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { uploadToBucket, deleteFromBucket, readFromBucket } from './s3Client';
interface Database { query(sql: string, params: unknown[]): Promise<{ rows: any[] }>; }
interface Storage { upload(key: string, buffer: Buffer, type: string): Promise<unknown>; remove(key: string): Promise<unknown>; read(key: string): Promise<Buffer>; }
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail = (status: number, message: string) => Object.assign(new Error(message), { status, code: status === 404 ? 'NOT_FOUND' : 'INVALID_INPUT' });
const columns = 'id, filename, content_type AS "contentType", created_at AS "createdAt"';
export function createEmergencyPhotoService(db: Database = pool, storage: Storage = { upload: uploadToBucket, remove: deleteFromBucket, read: readFromBucket }) {
 async function own(companyId: string, alertId: string) {
  if (!isUuid(alertId)) throw fail(400, 'Ongeldige spoedmelding.');
  if (!(await db.query('SELECT id FROM emergency_alerts WHERE id=$1 AND company_id=$2',[alertId,companyId])).rows.length) throw fail(404,'Spoedmelding niet gevonden.');
 }
 return {
  async list(companyId: string, alertId: string) {
   await own(companyId,alertId);
   return (await db.query(`SELECT ${columns} FROM emergency_alert_photos WHERE company_id=$1 AND alert_id=$2 ORDER BY created_at,id`,[companyId,alertId])).rows;
  },
  async upload(companyId: string, alertId: string, id: string, filename: string, buffer: Buffer) {
   await own(companyId,alertId);
   if (!isUuid(id)) throw fail(400,'Ongeldige foto-identificatie.');
   const existing=(await db.query(`SELECT ${columns} FROM emergency_alert_photos WHERE id=$1 AND company_id=$2 AND alert_id=$3`,[id,companyId,alertId])).rows[0];
   if (existing) return existing;
   const png=buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
   const jpeg=buffer.length>3 && buffer[0]===255 && buffer[1]===216 && buffer[2]===255;
   if (!png && !jpeg) throw fail(400,'Gebruik een JPG- of PNG-foto.');
   if (buffer.length>15*1024*1024) throw fail(413,'De foto is te groot (maximaal 15 MiB).');
   const type=png?'image/png':'image/jpeg';
   const key=`companies/${companyId}/emergency/${alertId}/${randomUUID()}.${png?'png':'jpg'}`;
   await storage.upload(key,buffer,type);
   try {
    const result=await db.query(`INSERT INTO emergency_alert_photos (id,company_id,alert_id,storage_key,filename,content_type) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING ${columns}`,[id,companyId,alertId,key,filename.slice(0,300),type]);
    if (result.rows.length) return result.rows[0];
    const winner=(await db.query(`SELECT ${columns} FROM emergency_alert_photos WHERE id=$1 AND company_id=$2 AND alert_id=$3`,[id,companyId,alertId])).rows[0];
    if (!winner) throw fail(400,'Deze foto-identificatie hoort bij een andere melding.');
    await storage.remove(key);return winner;
   } catch(error) { await storage.remove(key).catch(()=>{});throw error; }
  },
  async read(companyId: string, alertId: string, photoId: string) {
   await own(companyId,alertId);
   if (!isUuid(photoId)) throw fail(400,'Ongeldige foto.');
   const row=(await db.query('SELECT storage_key,content_type FROM emergency_alert_photos WHERE id=$1 AND alert_id=$2 AND company_id=$3',[photoId,alertId,companyId])).rows[0];
   if (!row) throw fail(404,'Foto niet gevonden.');
   return {buffer:await storage.read(row.storage_key),type:row.content_type as string};
  }
 };
}
