import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required for photo storage`);
  }
  return value;
};

let client: S3Client | null = null;

const getClient = (): S3Client => {
  if (client) return client;

  const region = getRequiredEnv('S3_REGION');
  const endpoint = process.env.S3_ENDPOINT || undefined;

  client = new S3Client({
    region,
    endpoint,
    // Cloudflare R2 and other S3-compatible endpoints need path-style addressing.
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: getRequiredEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('S3_SECRET_ACCESS_KEY'),
    },
  });

  return client;
};

export const uploadToBucket = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> => {
  const bucket = getRequiredEnv('S3_BUCKET');
  const publicUrlBase = getRequiredEnv('S3_PUBLIC_URL_BASE');

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${publicUrlBase.replace(/\/$/, '')}/${key}`;
};

export const deleteFromBucket = async (key: string): Promise<void> => {
  const bucket = getRequiredEnv('S3_BUCKET');

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};
