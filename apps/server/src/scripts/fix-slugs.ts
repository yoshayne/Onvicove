/**
 * One-shot script: re-derive slugs for tenants whose current slug doesn't
 * match their company name (e.g. auto-generated 'my-business-3' instead
 * of 'reelmotion'). Skips tenants that already have a correct slug.
 *
 * Run: cd apps/server && npx tsx src/scripts/fix-slugs.ts
 */
import { db } from '../db/client';
import { slugify } from '../lib/slugify';

async function generateUniqueSlugExcluding(baseName: string, excludeId: string): Promise<string> {
  const base = slugify(baseName);
  if (!base) return `store-${Date.now()}`;

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await db`
      SELECT id FROM tenants WHERE slug = ${slug} AND id != ${excludeId} LIMIT 1
    `;
    if (existing.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

async function main() {
  const tenants = await db`
    SELECT id, slug, company_name FROM tenants ORDER BY created_at ASC
  `;

  console.log(`Found ${tenants.length} tenant(s).`);

  let fixed = 0;
  for (const tenant of tenants) {
    const expected = slugify(tenant.company_name as string);
    const current = tenant.slug as string;

    // Already correct if current slug starts with the expected base
    // (e.g. 'reelmotion' or 'reelmotion-2' are both fine for company 'ReelMotion')
    if (current === expected || current.startsWith(`${expected}-`)) {
      console.log(`  ✓ ${tenant.id} — "${tenant.company_name}" → ${current} (ok)`);
      continue;
    }

    // Slug doesn't match company name — regenerate
    const newSlug = await generateUniqueSlugExcluding(tenant.company_name as string, tenant.id as string);
    await db`UPDATE tenants SET slug = ${newSlug}, updated_at = NOW() WHERE id = ${tenant.id}`;
    console.log(`  ✎ ${tenant.id} — "${tenant.company_name}": ${current} → ${newSlug}`);
    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} slug(s).`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
