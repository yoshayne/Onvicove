import 'dotenv/config';
import { startStripeNudgeJob } from './jobs/stripeNudge';
import { startBookingReminderJob } from './jobs/bookingReminder';
import { startInviteNudgeJob } from './jobs/inviteNudge';
import { startDomainRecheckJob } from './jobs/domainRecheck';
import { serve } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'path';
import { db, redis } from './db/client';
import { domainCache, type ResolvedStore } from './services/domainCache';
import { getBaseUrl, getActiveCustomDomain } from './lib/baseUrl';
import { handleError } from './lib/errorHandler';
import { isPlatformHost, normalizeHost, platformSubdomain, safeOrigin } from './lib/hosts';

// dist/index.js -> apps/server/dist -> repo root is 3 levels up
const CLIENT_DIST = join(__dirname, '../../../dist/client');

// Routes
import tenantRoutes from './routes/tenants';
import productRoutes from './routes/products';
import serviceRoutes from './routes/services';
import bookingRoutes from './routes/bookings';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import staffRoutes from './routes/staff';
import uploadRoutes from './routes/uploads';
import stripeRoutes from './routes/stripe';
import wizardRoutes from './routes/wizard';
import aiPhotoRoutes from './routes/ai-photos';
import discountRoutes from './routes/discounts';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscriptions';
import domainRoutes from './routes/domains';
import domainPurchaseRoutes from './routes/domain-purchases';
import inviteRoutes from './routes/invite';
import pageSectionRoutes from './routes/page-sections';
import blockedDateRoutes from './routes/blocked-dates';

const app = new Hono();

app.onError(handleError);

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'https://shopsuitedirect.com',
    'https://www.shopsuitedirect.com',
  ],
  credentials: true,
}));

// Health check — Railway uses this to confirm deploy succeeded
app.get('/health', async (c) => {
  try {
    await db`SELECT 1`;
    await redis.ping();
    c.header('x-shopsuite', '1');
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({ status: 'error', error: String(error) }, 500);
  }
});

// API routes
app.route('/api/tenants', tenantRoutes);
app.route('/api/products', productRoutes);
app.route('/api/services', serviceRoutes);
app.route('/api/bookings', bookingRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/customers', customerRoutes);
app.route('/api/staff', staffRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/stripe', stripeRoutes);
app.route('/api/wizard', wizardRoutes);
app.route('/api/ai-photos', aiPhotoRoutes);
app.route('/api/discounts', discountRoutes);
app.route('/api/public', publicRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhooks', webhookRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/domains', domainRoutes);
app.route('/api/domain-purchases', domainPurchaseRoutes);
app.route('/api/invite', inviteRoutes);
app.route('/api/page-sections', pageSectionRoutes);
app.route('/api/blocked-dates', blockedDateRoutes);

// Normalize double-slash paths (e.g. //claim/TOKEN → /claim/TOKEN)
// Happens when CLIENT_URL has a trailing slash and gets concatenated with /path
app.use('/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('//')) {
    const fixed = path.replace(/^\/+/, '/');
    const newUrl = new URL(c.req.url);
    newUrl.pathname = fixed;
    return c.redirect(newUrl.toString(), 301);
  }
  return next();
});

const PLATFORM_ONLY_PATHS = /^\/(dashboard|admin|sign-in|sign-up|onboarding|claim|guide)(\/|$)/;

// Host routing. A request on a verified custom domain (or <slug>.shopsuitedirect.com) is tagged
// with the store's slug; the SPA fallback hands that slug to the client so the store renders at "/".
// Must come before the static file handler.
app.use('/*', async (c, next) => {
  const url = new URL(c.req.url);
  const host = normalizeHost(c.req.header('host') ?? '');

  if (process.env.NODE_ENV === 'production' && c.req.header('x-forwarded-proto') === 'http' && !host.startsWith('localhost')) {
    return c.redirect(`https://${host}${url.pathname}${url.search}`, 301);
  }

  let store: ResolvedStore | null = null;

  if (isPlatformHost(host)) {
    const sub = platformSubdomain(host);
    if (sub) store = await domainCache.resolveSubdomain(sub);
  } else {
    store = await domainCache.resolve(host);
    if (!store && !host.startsWith('www.')) {
      // Apex pointed at us while the store is connected as www.<domain>
      const www = await domainCache.resolve(`www.${host}`);
      if (www) return c.redirect(`https://www.${host}${url.pathname}${url.search}`, 301);
    }
  }

  if (!store) return next();

  // Dashboard, admin and sign-in only work on the main site (auth is tied to that origin).
  if (PLATFORM_ONLY_PATHS.test(url.pathname)) {
    return c.redirect(`${getBaseUrl()}${url.pathname}${url.search}`, 302);
  }

  c.set('storeSlug', store.slug);
  return next();
});

app.get('/robots.txt', (c) => {
  const host = normalizeHost(c.req.header('host') ?? '');
  const origin = safeOrigin(c.req.header('x-forwarded-proto'), c.req.header('host'));
  const lines = ['User-agent: *'];
  if (c.get('storeSlug')) {
    lines.push('Allow: /');
    if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`);
  } else {
    lines.push('Disallow: /dashboard', 'Disallow: /admin', 'Disallow: /api', 'Disallow: /onboarding', 'Disallow: /claim', 'Disallow: /pay', 'Disallow: /sign-in', 'Disallow: /sign-up', 'Allow: /');
    if (isPlatformHost(host) && origin) lines.push(`Sitemap: ${origin}/sitemap.xml`);
  }
  return c.text(lines.join('\n') + '\n');
});

app.get('/sitemap.xml', (c) => {
  const origin = safeOrigin(c.req.header('x-forwarded-proto'), c.req.header('host'));
  if (!origin) return c.notFound();
  const slug = c.get('storeSlug');
  const loc = slug ? `${origin}/` : null;
  if (!loc) return c.notFound();
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${loc}</loc></url></urlset>\n`,
    200,
    { 'Content-Type': 'application/xml' },
  );
});

const NON_STORE_ROUTES = new Set([
  '', 'guide', 'sign-in', 'sign-up', 'onboarding', 'dashboard', 'admin', 'claim', 'pay', 'api', 'assets',
  'robots.txt', 'sitemap.xml', 'favicon.svg', 'health',
]);

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface StoreMetaResult {
  html?: string;
  redirectTo?: string;
}

// Crawlers don't run JS, so storefront share previews (og:image = hero image) must be in the HTML.
async function buildStoreHtml(
  html: string,
  opts: { path: string; search: string; origin: string; hostSlug?: string },
): Promise<StoreMetaResult> {
  const segments = opts.path.split('/').filter(Boolean);
  const pathSlug = segments[0] === 'store' ? segments[1] : segments[0];
  const slug = opts.hostSlug ?? (pathSlug && !NON_STORE_ROUTES.has(pathSlug) ? pathSlug : undefined);
  if (!slug) return { html };

  const rows = await db`
    SELECT company_name, tagline, hero_image_key, custom_domain, custom_domain_verified, custom_domain_status
    FROM tenants WHERE slug = ${slug} AND is_active = true LIMIT 1
  `;
  const t = rows[0] as {
    company_name: string; tagline: string | null; hero_image_key: string | null;
    custom_domain: string | null; custom_domain_verified: boolean; custom_domain_status: string | null;
  } | undefined;
  if (!t) return { html };

  const activeDomain = getActiveCustomDomain({
    custom_domain: t.custom_domain, custom_domain_verified: t.custom_domain_verified, custom_domain_status: t.custom_domain_status,
  });

  // The default URL stays reachable but sends visitors and crawlers to the live custom domain.
  if (!opts.hostSlug && activeDomain) {
    const rest = segments.slice(1).join('/');
    return { redirectTo: `https://${activeDomain}/${rest}${opts.search}` };
  }

  const title = escapeAttr(t.company_name);
  const description = escapeAttr(t.tagline || `Shop ${t.company_name}`);
  const pageUrl = escapeAttr(`${opts.origin}${opts.path}`);
  const image = t.hero_image_key ? escapeAttr(`${opts.origin}/api/public/${slug}/og-image`) : '';
  const tags = [
    `<title>${title}</title>`,
    `<link rel="canonical" href="${pageUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${title}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    image && `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    image && `<meta name="twitter:image" content="${image}" />`,
    opts.hostSlug && `<script>window.__STORE_SLUG__=${JSON.stringify(opts.hostSlug)};</script>`,
  ].filter(Boolean).join('\n    ');

  // Function replacers: tenant text may contain "$&" / "$'" which String.replace would expand.
  return {
    html: html
      .replace(/<title>[\s\S]*?<\/title>\s*/, () => '')
      .replace(/<meta (?:property="og:|name="twitter:)[^>]*>\s*/g, () => '')
      .replace('</head>', () => `    ${tags}\n  </head>`),
  };
}

// Serves index.html with per-store meta/slug injected.
const serveSpa = async (c: Context) => {
  const html = await import('fs').then(fs =>
    fs.promises.readFile(join(CLIENT_DIST, 'index.html'), 'utf-8')
  );
  try {
    const reqUrl = new URL(c.req.url);
    const fallbackOrigin = new URL(getBaseUrl()).origin;
    const origin = safeOrigin(c.req.header('x-forwarded-proto'), c.req.header('host')) ?? fallbackOrigin;
    const result = await buildStoreHtml(html, {
      path: reqUrl.pathname,
      search: reqUrl.search,
      origin,
      hostSlug: c.get('storeSlug'),
    });
    if (result.redirectTo) return c.redirect(result.redirectTo, 301);
    return c.html(result.html ?? html);
  } catch (err) {
    console.error('Storefront meta injection failed:', err);
    return c.html(html);
  }
};

// "/" must go through serveSpa too — the static handler would otherwise answer it with the raw index.html.
app.get('/', serveSpa);
app.get('/index.html', serveSpa);

// Serve React client for all non-API routes
// The Vite build outputs to dist/client relative to repo root
app.use('/*', serveStatic({ root: CLIENT_DIST }));

// SPA fallback — serve index.html for all unmatched routes
app.get('/*', serveSpa);

const port = parseInt(process.env.PORT || '3000');

console.log(`
╔═══════════════════════════════════╗
║  Shop Suite Direct server...      ║
║  Port: ${port}                        ║
║  Env:  ${process.env.NODE_ENV || 'development'}               ║
╚═══════════════════════════════════╝
`);

serve({ fetch: app.fetch, port });
startStripeNudgeJob();
startBookingReminderJob();
startInviteNudgeJob();
startDomainRecheckJob();
