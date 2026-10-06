import 'dotenv/config';
import { startStripeNudgeJob } from './jobs/stripeNudge';
import { startBookingReminderJob } from './jobs/bookingReminder';
import { startInviteNudgeJob } from './jobs/inviteNudge';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'path';
import { db, redis } from './db/client';
import { domainCache } from './services/domainCache';
import { getSignedFileUrl } from './services/storage';

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

const app = new Hono();

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

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

// Custom domain middleware — if Host matches a verified tenant domain,
// inject the tenant slug so the SPA can resolve the storefront.
// Must come before the static file handler.
app.use('/*', async (c, next) => {
  const host = c.req.header('host') ?? '';
  const ownHosts = [
    'localhost',
    '127.0.0.1',
    process.env.RAILWAY_PUBLIC_DOMAIN ?? '',
    'shopsuitedirect.com',
    'www.shopsuitedirect.com',
  ].filter(Boolean);

  const isOwnHost = ownHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (isOwnHost) return next();

  // Strip port for local dev
  const domain = host.replace(/:\d+$/, '');
  const tenantId = await domainCache.resolve(domain);
  if (!tenantId) return next();

  // Look up the slug so the SPA knows which store to render at /
  const rows = await db`SELECT slug FROM tenants WHERE id = ${tenantId} LIMIT 1`;
  if (!rows[0]) return next();

  // Rewrite the path to /store/:slug so the React router handles it
  const slug = rows[0].slug as string;
  const originalPath = new URL(c.req.url).pathname;
  const rewritten = originalPath === '/' ? `/store/${slug}` : `/store/${slug}${originalPath}`;

  c.req.raw = new Request(
    new URL(rewritten, c.req.url).toString(),
    c.req.raw,
  );
  return next();
});

// Serve React client for all non-API routes
// The Vite build outputs to dist/client relative to repo root
app.use('/*', serveStatic({ root: CLIENT_DIST }));

const NON_STORE_ROUTES = new Set([
  '', 'guide', 'sign-in', 'sign-up', 'onboarding', 'dashboard', 'admin', 'claim', 'pay', 'api', 'assets',
]);

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Crawlers don't run JS, so storefront share previews (og:image = hero image) must be in the HTML.
async function injectStorefrontMeta(html: string, path: string, origin: string): Promise<string> {
  const segments = path.split('/').filter(Boolean);
  const slug = segments[0] === 'store' ? segments[1] : segments[0];
  if (!slug || NON_STORE_ROUTES.has(slug)) return html;

  const rows = await db`
    SELECT company_name, tagline, hero_image_key
    FROM tenants WHERE slug = ${slug} AND is_active = true LIMIT 1
  `;
  const t = rows[0] as { company_name: string; tagline: string | null; hero_image_key: string | null } | undefined;
  if (!t) return html;

  const image = t.hero_image_key ? await getSignedFileUrl(t.hero_image_key) : '';
  const title = escapeAttr(t.company_name);
  const description = escapeAttr(t.tagline || `Shop ${t.company_name}`);
  const url = escapeAttr(`${origin}${path}`);
  const tags = [
    `<title>${title}</title>`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${title}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    image && `<meta property="og:image" content="${escapeAttr(image)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    image && `<meta name="twitter:image" content="${escapeAttr(image)}" />`,
  ].filter(Boolean).join('\n    ');

  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta (?:property="og:|name="twitter:)[^>]*>\s*/g, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

// SPA fallback — serve index.html for all unmatched routes
app.get('/*', async (c) => {
  const html = await import('fs').then(fs =>
    fs.promises.readFile(join(CLIENT_DIST, 'index.html'), 'utf-8')
  );
  try {
    const reqUrl = new URL(c.req.url);
    const proto = c.req.header('x-forwarded-proto') || reqUrl.protocol.replace(':', '');
    const host = c.req.header('host') || reqUrl.host;
    return c.html(await injectStorefrontMeta(html, reqUrl.pathname, `${proto}://${host}`));
  } catch (err) {
    console.error('Storefront meta injection failed:', err);
    return c.html(html);
  }
});

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
