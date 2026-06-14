import sharp from 'sharp';

/**
 * Overlays a diagonal repeating "PREVIEW" watermark pattern onto an image buffer.
 */
export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  const tileSize = Math.max(Math.round(Math.min(width, height) / 4), 100);
  const fontSize = Math.round(tileSize / 4);

  let tiles = '';
  for (let y = -tileSize; y < height + tileSize; y += tileSize) {
    for (let x = -tileSize; x < width + tileSize; x += tileSize) {
      tiles += `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255,255,255,0.35)" transform="rotate(-30 ${x} ${y})">PREVIEW</text>`;
    }
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${tiles}
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  return image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
