import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { db, redis } from './db/client';

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

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'https://onvicove.com',
    'https://www.onvicove.com',
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

// Serve React client for all non-API routes
// The Vite build outputs to dist/client relative to repo root
app.use('/*', serveStatic({ root: './dist/client' }));

// SPA fallback — serve index.html for all unmatched routes
app.get('/*', async (c) => {
  return c.html(await import('fs').then(fs =>
    fs.promises.readFile('./dist/client/index.html', 'utf-8')
  ));
});

const port = parseInt(process.env.PORT || '3000');

console.log(`
╔═══════════════════════════════════╗
║  Onvicove server starting...      ║
║  Port: ${port}                        ║
║  Env:  ${process.env.NODE_ENV || 'development'}               ║
╚═══════════════════════════════════╝
`);

serve({ fetch: app.fetch, port });
