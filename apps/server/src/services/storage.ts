import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
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

// Cached links are tied to the storage credentials that signed them: when the credentials change (a rotation),
// every old link is skipped at once instead of staying broken until the cache expires.
const CRED_TAG = createHash('sha256')
  .update(`${process.env.BUCKET_ENDPOINT_URL}|${process.env.BUCKET_NAME}|${process.env.BUCKET_ACCESS_KEY_ID}`)
  .digest('hex')
  .slice(0, 8);

/** Quick test of the photo storage: write, read and delete a tiny file. Returns what is wrong, in plain words. */
export async function checkStorage(): Promise<{ ok: boolean; message: string }> {
  const missing = ['BUCKET_ENDPOINT_URL', 'BUCKET_NAME', 'BUCKET_ACCESS_KEY_ID', 'BUCKET_SECRET_ACCESS_KEY'].filter((k) => !process.env[k]);
  if (missing.length) return { ok: false, message: `These variables are missing: ${missing.join(', ')}` };
  const key = `healthcheck/${Date.now()}.txt`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: Buffer.from('ok'), ContentType: 'text/plain' }));
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 60 });
    const res = await fetch(url);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => undefined);
    if (!res.ok) return { ok: false, message: `Uploading works, but reading a file back failed (${res.status}). The bucket address or access settings may be wrong.` };
    return { ok: true, message: 'Photo storage works: a test file was written, read and removed.' };
  } catch (err) {
    const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number }; message?: string };
    const status = e.$metadata?.httpStatusCode;
    const hint = status === 403 || e.name === 'InvalidAccessKeyId' || e.name === 'SignatureDoesNotMatch'
      ? 'The storage keys are wrong or were rotated. Copy the current keys from the Railway bucket into BUCKET_ACCESS_KEY_ID and BUCKET_SECRET_ACCESS_KEY, then redeploy.'
      : status === 404 || e.name === 'NoSuchBucket' ? 'The bucket name or address looks wrong (BUCKET_NAME / BUCKET_ENDPOINT_URL).' : '';
    return { ok: false, message: `${e.name ?? 'Error'}${status ? ` (${status})` : ''}: ${e.message ?? ''} ${hint}`.trim() };
  }
}

/**
 * Older gallery photos were saved with only their (expired) link and no file name. The file name is inside the link,
 * so we can get it back and make a fresh link.
 */
export function keyFromSignedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let path = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (BUCKET && path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1); // path-style links start with the bucket name
    else if (u.hostname.startsWith(`${BUCKET}.`)) { /* virtual-host style: the path is the key */ }
    return path && /\.[a-z0-9]{2,5}$/i.test(path) ? path : null;
  } catch {
    return null;
  }
}

/** Make a fresh link for each gallery photo (using its stored file name, or the one hidden in an older link) */
export async function refreshGalleryUrls(sections: any[]): Promise<void> {
  await Promise.all(
    sections.map(async (section: any) => {
      if (section.type !== 'gallery' || !Array.isArray(section.images)) return;
      await Promise.all(
        section.images.map(async (img: any) => {
          const key = img.key || keyFromSignedUrl(img.url);
          if (key) {
            img.key = key;
            img.url = await getSignedFileUrl(key);
          }
        }),
      );
    }),
  );
}

/** Forget every saved photo link, so all of them are made fresh on the next visit */
export async function flushPhotoLinkCache(): Promise<number> {
  let cursor = '0';
  let removed = 0;
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'signed_url:*', 'COUNT', 500);
    cursor = next;
    if (keys.length) removed += await redis.del(...keys);
  } while (cursor !== '0');
  return removed;
}

export async function getSignedFileUrl(key: string): Promise<string> {
  if (!key) return '';

  const cacheKey = `signed_url:${CRED_TAG}:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: URL_TTL_SECONDS });

  await redis.setex(cacheKey, CACHE_TTL_SECONDS, url);
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  await redis.del(`signed_url:${CRED_TAG}:${key}`);
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
  const aboutKey = row.page_content && typeof row.page_content === 'object' ? (row.page_content as Record<string, unknown>)['about.image_key'] : null;
  if (typeof aboutKey === 'string' && aboutKey) result.about_image_url = await getSignedFileUrl(aboutKey);
  if (row.favicon_key) result.favicon_url = await getSignedFileUrl(row.favicon_key);
  if (row.avatar_key) result.avatar_url = await getSignedFileUrl(row.avatar_key);
  if (row.cutout_image_key) result.cutout_image_url = await getSignedFileUrl(row.cutout_image_key);
  if (row.preview_image_key) result.preview_image_url = await getSignedFileUrl(row.preview_image_key);
  if (row.full_image_key) result.full_image_url = await getSignedFileUrl(row.full_image_key);

  return result;
}
