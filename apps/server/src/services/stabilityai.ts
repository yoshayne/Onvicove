import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Calls the Stability AI image-to-image API to generate a styled product
 * photo from a background-removed cutout image and a style prompt.
 * Returns the generated image buffer (PNG).
 */
export async function generateStyledPhoto(
  cutoutBuffer: Buffer,
  prompt: string,
  filename = 'cutout.png'
): Promise<Buffer> {
  const apiKey = process.env.STABILITY_AI_KEY;
  if (!apiKey) {
    throw new Error('STABILITY_AI_KEY environment variable is required');
  }

  const form = new FormData();
  form.append('init_image', cutoutBuffer, { filename });
  form.append('init_image_mode', 'IMAGE_STRENGTH');
  form.append('image_strength', '0.35');
  form.append('text_prompts[0][text]', prompt);
  form.append('text_prompts[0][weight]', '1');
  form.append('cfg_scale', '7');
  form.append('samples', '1');
  form.append('steps', '30');

  const engineId = 'stable-diffusion-xl-1024-v1-0';

  const response = await fetch(
    `https://api.stability.ai/v1/generation/${engineId}/image-to-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...form.getHeaders(),
      },
      body: form as unknown as NodeJS.ReadableStream,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stability AI API error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { artifacts: { base64: string }[] };
  const artifact = json.artifacts?.[0];
  if (!artifact) {
    throw new Error('Stability AI returned no image artifacts');
  }

  return Buffer.from(artifact.base64, 'base64');
}

export const AI_PHOTO_STYLES: { id: string; label: string; prompt: string }[] = [
  { id: 'studio', label: 'Studio White', prompt: 'product photo on a clean white studio background, soft shadows, professional lighting' },
  { id: 'lifestyle', label: 'Lifestyle', prompt: 'product photo in a cozy lifestyle setting, natural light, styled scene' },
  { id: 'outdoor', label: 'Outdoor', prompt: 'product photo outdoors, natural sunlight, greenery in background' },
  { id: 'marble', label: 'Marble Luxe', prompt: 'product photo on a marble surface, luxury aesthetic, elegant lighting' },
  { id: 'gradient', label: 'Gradient Pop', prompt: 'product photo on a vibrant gradient background, modern editorial style' },
  { id: 'wood', label: 'Rustic Wood', prompt: 'product photo on a rustic wooden table, warm tones, artisan feel' },
];
