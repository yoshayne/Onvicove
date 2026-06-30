import 'dotenv/config';
import { startStripeNudgeJob } from './jobs/stripeNudge';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'path';
import { db, redis } from './db/client';
import { domainCache } from './services/domainCache';

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
import pageSectionRoutes from './routes/page-sections';

const app = new Hono();

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return origin;
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      `https://${PLATFORM_DOMAIN}`,
      `https://www.${PLATFORM_DOMAIN}`,
    ];
    if (allowed.includes(origin)) return origin;
    // Allow any subdomain of the platform domain
    if (origin.endsWith(`.${PLATFORM_DOMAIN}`)) return origin;
    return null;
  },
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
app.route('/api/page-sections', pageSectionRoutes);

// Custom domain middleware — if Host matches a verified tenant domain,
// inject the tenant slug so the SPA can resolve the storefront.
// Must come before the static file handler.
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'shopsuitedirect.com';
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app', 'admin', 'mail', 'ftp']);

app.use('/*', async (c, next) => {
  const host = c.req.header('host') ?? '';
  const hostNoPort = host.replace(/:\d+$/, '');

  // ── Platform subdomain: {slug}.shopsuitedirect.com ──────────────────────────
  if (hostNoPort.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const sub = hostNoPort.slice(0, hostNoPort.length - PLATFORM_DOMAIN.length - 1);
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      const originalPath = new URL(c.req.url).pathname;
      const rewritten = originalPath === '/' ? `/store/${sub}` : `/store/${sub}${originalPath}`;
      c.req.raw = new Request(new URL(rewritten, c.req.url).toString(), c.req.raw);
      return next();
    }
  }

  const ownHosts = [
    'localhost',
    '127.0.0.1',
    process.env.RAILWAY_PUBLIC_DOMAIN ?? '',
    PLATFORM_DOMAIN,
    `www.${PLATFORM_DOMAIN}`,
  ].filter(Boolean);

  const isOwnHost = ownHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (isOwnHost) return next();

  // ── Custom tenant domain ─────────────────────────────────────────────────────
  const domain = hostNoPort;
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

// SPA fallback — serve index.html for all unmatched routes
app.get('/*', async (c) => {
  return c.html(await import('fs').then(fs =>
    fs.promises.readFile(join(CLIENT_DIST, 'index.html'), 'utf-8')
  ));
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
