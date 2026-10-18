import {
  normalizeChatText,
  type ChatChannel,
  type ChatMessage,
  type ChatPage,
} from '@glaszetter/shared';
import { randomUUID, createHash } from 'crypto';
import { detectMedia } from './mediaService';
import { uploadToBucket, deleteFromBucket } from './s3Client';
import { pool } from '../db/pool';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (message: string, status = 400) =>
  Object.assign(new Error(message), { status, code: 'CHAT_ERROR' });
export async function checkChatUser(companyId: string, userId: string) {
  const result = await pool.query('SELECT id FROM users WHERE id=$1 AND company_id=$2', [
    userId,
    companyId,
  ]);
  if (!result.rows.length) throw invalid('Meld je opnieuw aan om te chatten.', 401);
}
export async function checkChatChannel(
  companyId: string,
  channelId: string
): Promise<string | null> {
  if (channelId === 'company') return null;
  if (!uuid.test(channelId)) throw invalid('Ongeldig gesprek.');
  const job = await pool.query('SELECT id FROM jobs WHERE id=$1 AND company_id=$2', [
    channelId,
    companyId,
  ]);
  if (!job.rows.length) throw invalid('Gesprek niet gevonden.', 404);
  return channelId;
}
const messageColumns = `CASE WHEN m.attachment_key IS NULL THEN NULL ELSE json_build_object('kind',m.attachment_kind,'url',m.attachment_url,'filename',m.attachment_filename,'sizeBytes',m.attachment_size) END AS attachment,m.id,m.sequence::text AS sequence,COALESCE(m.job_id::text,'company') AS "channelId",m.sender_id AS "senderId",COALESCE(u.name,'Verwijderde medewerker') AS "senderName",m.body AS text,m.created_at AS "createdAt",m.client_id AS "clientId"`;
export async function chatChannels(companyId: string, userId: string): Promise<ChatChannel[]> {
  await checkChatUser(companyId, userId);
  const jobs = await pool.query<{ id: string; name: string }>(
    'SELECT id,name FROM jobs WHERE company_id=$1 ORDER BY name,id',
    [companyId]
  );
  return [
    { id: 'company', name: 'Bedrijfschat', kind: 'company' },
    ...jobs.rows.map((job) => ({ ...job, kind: 'job' as const })),
  ];
}
export async function chatMessages(
  companyId: string,
  userId: string,
  channelId: string,
  before?: string
): Promise<ChatPage> {
  await checkChatUser(companyId, userId);
  const jobId = await checkChatChannel(companyId, channelId);
  if (
    before !== undefined &&
    (!/^[1-9][0-9]{0,18}$/.test(before) || BigInt(before) > 9223372036854775807n)
  )
    throw invalid('Ongeldige berichtpagina.');
  const result = await pool.query<ChatMessage>(
    `SELECT ${messageColumns} FROM chat_messages m LEFT JOIN users u ON u.id=m.sender_id AND u.company_id=m.company_id
    WHERE m.company_id=$1 AND m.job_id IS NOT DISTINCT FROM $2::uuid ${before ? 'AND m.sequence < $3::bigint' : ''}
    ORDER BY m.sequence DESC LIMIT 51`,
    before ? [companyId, jobId, before] : [companyId, jobId]
  );
  return { messages: result.rows.slice(0, 50).reverse(), hasOlder: result.rows.length > 50 };
}
interface Attachment {
  key: string;
  url: string;
  kind: string;
  filename: string;
  type: string;
  size: number;
  hash: string;
}
async function storeMessage(
  companyId: string,
  userId: string,
  jobId: string | null,
  clientId: string,
  text: string,
  attachment?: Attachment
): Promise<ChatMessage & { storageKey?: string }> {
  const result = await pool.query<ChatMessage & { storageKey?: string }>(
    `WITH saved AS (
    INSERT INTO chat_messages(company_id,job_id,sender_id,client_id,body,attachment_key,attachment_url,attachment_kind,attachment_filename,attachment_type,attachment_size,attachment_hash)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT ON CONSTRAINT chat_retry_unique DO UPDATE SET client_id=EXCLUDED.client_id
    WHERE chat_messages.body=EXCLUDED.body AND chat_messages.job_id IS NOT DISTINCT FROM EXCLUDED.job_id
      AND chat_messages.attachment_hash IS NOT DISTINCT FROM EXCLUDED.attachment_hash
    RETURNING *
  ) SELECT ${messageColumns},m.attachment_key AS "storageKey" FROM saved m LEFT JOIN users u ON u.id=m.sender_id AND u.company_id=m.company_id`,
    [
      companyId,
      jobId,
      userId,
      clientId,
      text,
      attachment?.key || null,
      attachment?.url || null,
      attachment?.kind || null,
      attachment?.filename || null,
      attachment?.type || null,
      attachment?.size || null,
      attachment?.hash || null,
    ]
  );
  if (!result.rows.length)
    throw invalid('Dit berichtnummer is al gebruikt. Open het gesprek opnieuw.', 409);
  return result.rows[0];
}
export async function sendChatMessage(
  companyId: string,
  userId: string,
  channelId: string,
  input: { text?: unknown; clientId?: unknown }
): Promise<ChatMessage> {
  const text = normalizeChatText(input.text);
  if (!text || typeof input.clientId !== 'string' || !uuid.test(input.clientId))
    throw invalid('Schrijf een bericht van 1–4000 tekens.');
  await checkChatUser(companyId, userId);
  const jobId = await checkChatChannel(companyId, channelId);
  const { storageKey: _key, ...message } = await storeMessage(
    companyId,
    userId,
    jobId,
    input.clientId,
    text
  );
  return message;
}
export async function sendChatAttachment(
  companyId: string,
  userId: string,
  channelId: string,
  input: { text?: unknown; clientId?: unknown },
  file: { buffer: Buffer; originalname: string }
): Promise<ChatMessage> {
  const text = normalizeChatText(input.text ?? '', true);
  if (text === null || typeof input.clientId !== 'string' || !uuid.test(input.clientId))
    throw invalid('Controleer je bericht en bijlage.');
  await checkChatUser(companyId, userId);
  const jobId = await checkChatChannel(companyId, channelId);
  const { kind, mime, extension } = detectMedia(file.buffer);
  const key = `companies/${companyId}/chat/${randomUUID()}.${extension}`;
  const url = await uploadToBucket(key, file.buffer, mime);
  const attachment: Attachment = {
    key,
    url,
    kind,
    type: mime,
    size: file.buffer.length,
    hash: createHash('sha256').update(file.buffer).digest('hex'),
    filename: (file.originalname.split(/[\\/]/).pop() || 'Bijlage')
      .replace(/[\u0000-\u001f]/g, '')
      .slice(0, 180),
  };
  try {
    const { storageKey, ...message } = await storeMessage(
      companyId,
      userId,
      jobId,
      input.clientId,
      text,
      attachment
    );
    if (storageKey !== key) await deleteFromBucket(key).catch(() => {});
    return message;
  } catch (error) {
    await deleteFromBucket(key).catch(() => {});
    throw error;
  }
}
