import fetch from 'node-fetch';
import sharp from 'sharp';

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
 * Returns the processed (cutout) image buffer with a transparent/white background.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  return generateImage(
    [
      'Remove ONLY the background from this product photo.',
      'Leave the product itself 100% unchanged — do not alter, redraw, or modify the product in any way.',
      'Preserve every detail: all text, logos, graphics, prints, colors, textures, and shapes on the product must remain pixel-perfect.',
      'Place the product on a plain solid white (#FFFFFF) background with no shadows.',
    ].join(' '),
    imageBuffer
  );
}

/**
 * Studio White: compose the cutout directly onto a white canvas with a soft drop shadow.
 * This bypasses Gemini entirely, which means logos/graphics are NEVER hallucinated.
 */
export async function studioWhiteComposite(cutoutBuffer: Buffer): Promise<Buffer> {
  const img = sharp(cutoutBuffer);
  const meta = await img.metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  // Add padding so the shadow has room to breathe
  const pad = Math.round(Math.min(w, h) * 0.12);
  const canvasW = w + pad * 2;
  const canvasH = h + pad * 2;

  // Soft drop shadow via a blurred dark copy
  const shadowBlur = Math.round(Math.min(w, h) * 0.04);
  const shadowOffset = Math.round(shadowBlur * 0.6);

  const shadowLayer = await sharp(cutoutBuffer)
    .flatten({ background: { r: 20, g: 20, b: 20 } })
    .blur(shadowBlur)
    .composite([{
      input: Buffer.from(
        `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="rgba(0,0,0,0.18)"/></svg>`
      ),
      blend: 'multiply',
    }])
    .png()
    .toBuffer();

  // White canvas → shadow → product on top
  return sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: shadowLayer, left: pad + shadowOffset, top: pad + shadowOffset },
      { input: cutoutBuffer, left: pad, top: pad },
    ])
    .png()
    .toBuffer();
}

/**
 * Uses Gemini to generate a styled product photo for non-studio styles.
 * Includes strong logo/graphic preservation language to reduce hallucination.
 */
export async function generateStyledPhoto(
  cutoutBuffer: Buffer,
  stylePrompt: string,
  productDescription?: string,
  productCategory?: string
): Promise<Buffer> {
  const productContext = productDescription
    ? `The product is: ${productDescription}${productCategory ? ` (${productCategory})` : ''}.`
    : '';

  const prompt = [
    'High-end fashion and product e-commerce photography.',
    productContext,
    productContext ? 'This specific product is the sole subject — keep it perfectly centered and prominent.' : '',
    // Logo/graphic preservation — the most important instruction
    'CRITICAL: Preserve ALL text, logos, graphic prints, embroidery, patterns, and artwork on the product EXACTLY as they appear in the source image.',
    'Do NOT alter, simplify, recreate, or hallucinate any text or graphics — they must remain identical.',
    // Scene
    `Scene: ${stylePrompt}.`,
    // Quality language
    'Lighting: professional soft-box studio strobe, even exposure with gentle fill, no harsh shadows on the product.',
    'Sharp focus on fabric texture and surface details.',
    'The result should look like a product image from a luxury fashion retailer (Net-a-Porter, SSENSE, Farfetch quality).',
    'No people, no mannequin unless the style explicitly requires it.',
  ]
    .filter(Boolean)
    .join(' ');

  return generateImage(prompt, cutoutBuffer);
}

export const AI_PHOTO_STYLES: { id: string; label: string; prompt: string; bypass?: 'studio-white' }[] = [
  {
    id: 'studio',
    label: 'Studio White',
    prompt: 'clean white seamless background, professional soft-box lighting, subtle drop shadow',
    bypass: 'studio-white', // handled without Gemini — zero hallucination risk
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    prompt: 'upscale lifestyle setting, natural window light, softly blurred neutral interior background, editorial feel',
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    prompt: 'outdoor fashion editorial, golden hour natural sunlight, clean concrete or greenery background, magazine quality',
  },
  {
    id: 'marble',
    label: 'Marble Luxe',
    prompt: 'white Carrara marble surface, luxury brand aesthetic, soft overhead studio lighting, high-end jewelry or beauty campaign style',
  },
  {
    id: 'gradient',
    label: 'Gradient Pop',
    prompt: 'vibrant pastel-to-deep gradient background, modern Gen Z streetwear editorial style, clean studio lighting',
  },
  {
    id: 'wood',
    label: 'Rustic Wood',
    prompt: 'warm weathered oak wood surface, artisan lifestyle brand aesthetic, soft diffused natural light, clean composition',
  },
];
