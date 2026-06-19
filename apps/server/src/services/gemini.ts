import fetch from 'node-fetch';

const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { inlineData?: { data: string; mimeType: string } }[];
    };
  }[];
}

async function generateImage(prompt: string, imageBuffer?: Buffer, mimeType = 'image/png'): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (imageBuffer) {
    parts.unshift({
      inlineData: { mimeType, data: imageBuffer.toString('base64') },
    });
  }

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const inlineData = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inlineData) {
    throw new Error('Gemini returned no image data');
  }

  return Buffer.from(inlineData.data, 'base64');
}

/**
 * Uses Gemini to remove the background from a product image.
 * Returns the processed (cutout) image buffer (PNG with a clean white background).
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  return generateImage(
    'Remove the background from this product photo completely, leaving only the product on a plain solid white background. Keep the product itself unchanged.',
    imageBuffer
  );
}

/**
 * Uses Gemini to generate a styled product photo from a cutout image and a style prompt.
 * Returns the generated image buffer (PNG).
 */
export async function generateStyledPhoto(
  cutoutBuffer: Buffer,
  stylePrompt: string,
  productDescription?: string,
  productCategory?: string
): Promise<Buffer> {
  const productContext = productDescription
    ? `The product is: ${productDescription}${productCategory ? ` (${productCategory})` : ''}. Focus entirely on this specific product as the main subject.`
    : '';

  const prompt = [
    'Professional commercial product photography.',
    productContext,
    `Scene: ${stylePrompt}.`,
    'Create a clean, high-quality photo suitable for an online store or product catalog.',
    'The product must be the clear focal point with sharp detail and perfect lighting.',
    'Commercial quality output. Do not add extra objects or people unless they are part of the scene style.',
  ]
    .filter(Boolean)
    .join(' ');

  return generateImage(prompt, cutoutBuffer);
}

export const AI_PHOTO_STYLES: { id: string; label: string; prompt: string }[] = [
  { id: 'studio', label: 'Studio White', prompt: 'product photo on a clean white studio background, soft shadows, professional lighting' },
  { id: 'lifestyle', label: 'Lifestyle', prompt: 'product photo in a cozy lifestyle setting, natural light, styled scene' },
  { id: 'outdoor', label: 'Outdoor', prompt: 'product photo outdoors, natural sunlight, greenery in background' },
  { id: 'marble', label: 'Marble Luxe', prompt: 'product photo on a marble surface, luxury aesthetic, elegant lighting' },
  { id: 'gradient', label: 'Gradient Pop', prompt: 'product photo on a vibrant gradient background, modern editorial style' },
  { id: 'wood', label: 'Rustic Wood', prompt: 'product photo on a rustic wooden table, warm tones, artisan feel' },
];
