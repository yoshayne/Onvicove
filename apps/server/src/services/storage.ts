import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { redis } from '../db/client';

// IMPORTANT: forcePathStyle MUST be true for Railway Object Storage
const s3 = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT_URL!,
  region: process.env.BUCKET_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.BUCKET_NAME!;
const URL_TTL_SECONDS = 604800;   // 7 days
const CACHE_TTL_SECONDS = 518400; // 6 days (refresh before URL expires)

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  // Always return the key, never the URL — URLs are generated on demand
  return key;
}

export async function getSignedFileUrl(key: string): Promise<string> {
  if (!key) return '';

  const cacheKey = `signed_url:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: URL_TTL_SECONDS });

  await redis.setex(cacheKey, CACHE_TTL_SECONDS, url);
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  await redis.del(`signed_url:${key}`);
}

// Enrich any database row that has image keys with signed URLs
export async function enrichWithUrls(row: any): Promise<any> {
  const result = { ...row };

  if (row.image_keys && Array.isArray(row.image_keys)) {
    result.image_urls = await Promise.all(
      row.image_keys.filter(Boolean).map((k: string) => getSignedFileUrl(k))
    );
  }
  if (row.logo_key) result.logo_url = await getSignedFileUrl(row.logo_key);
  if (row.hero_image_key) result.hero_image_url = await getSignedFileUrl(row.hero_image_key);
  if (row.avatar_key) result.avatar_url = await getSignedFileUrl(row.avatar_key);
  if (row.cutout_image_key) result.cutout_image_url = await getSignedFileUrl(row.cutout_image_key);
  if (row.preview_image_key) result.preview_image_url = await getSignedFileUrl(row.preview_image_key);
  if (row.full_image_key) result.full_image_url = await getSignedFileUrl(row.full_image_key);

  return result;
}
