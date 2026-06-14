import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Calls the Photoroom API to remove the background from a product image.
 * Returns the processed (cutout) image buffer (PNG with transparency).
 */
export async function removeBackground(imageBuffer: Buffer, filename = 'image.png'): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    throw new Error('PHOTOROOM_API_KEY environment variable is required');
  }

  const form = new FormData();
  form.append('image_file', imageBuffer, { filename });
  form.append('format', 'png');

  const response = await fetch('https://sdk.photoroom.com/v1/segment', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      ...form.getHeaders(),
    },
    body: form as unknown as NodeJS.ReadableStream,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photoroom API error (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
