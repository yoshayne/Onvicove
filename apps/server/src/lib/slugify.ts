import { db } from '../db/client';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugify(baseName);
  if (!base) return `store-${Date.now()}`;

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await db`
      SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1
    `;
    if (existing.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const clean = slugify(slug);
  if (!clean) return false;
  const existing = await db`
    SELECT id FROM tenants WHERE slug = ${clean} LIMIT 1
  `;
  return existing.length === 0;
}
