import { Hono } from 'hono';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { uploadFile, getSignedFileUrl } from '../services/storage';

const app = new Hono();

app.use('*', requireAuth, requireTenant);

const MAX_DIMENSION = 2000;

// POST /api/uploads — multipart form field "image"
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };

  const body = await c.req.parseBody();
  const file = body['image'];

  if (!(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Unsupported image type' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  try {
    const processed = await sharp(inputBuffer)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `tenants/${tenant.id}/uploads/${uuidv4()}.webp`;
    await uploadFile(key, processed, 'image/webp');

    return c.json({ key, url: await getSignedFileUrl(key) }, 201);
  } catch (err) {
    console.error('Upload failed:', err);
    return c.json({ error: `Upload failed: ${String(err)}` }, 500);
  }
});

export default app;
