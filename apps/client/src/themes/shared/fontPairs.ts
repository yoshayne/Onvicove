export type FontPairId =
  | 'classic'
  | 'modern'
  | 'elegant'
  | 'editorial'
  | 'bold'
  | 'soft'
  | 'tech'
  | 'artisan';

export interface FontPair {
  id: FontPairId;
  name: string;
  description: string;
  heading: string;      // CSS font-family value
  body: string;
  googleFontsUrl: string;
  previewHeading: string;
  previewBody: string;
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless serif pairing',
    heading: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600&display=swap',
    previewHeading: 'Playfair Display',
    previewBody: 'Source Sans 3',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean geometric sans-serif',
    heading: "'DM Sans', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
    previewHeading: 'DM Sans',
    previewBody: 'DM Sans',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Luxury brand aesthetic',
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Jost', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap',
    previewHeading: 'Cormorant Garamond',
    previewBody: 'Jost',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style contrast',
    heading: "'Bebas Neue', Impact, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap',
    previewHeading: 'Bebas Neue',
    previewBody: 'Inter',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong, confident presence',
    heading: "'Syne', system-ui, sans-serif",
    body: "'Outfit', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@300;400;500&display=swap',
    previewHeading: 'Syne',
    previewBody: 'Outfit',
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Friendly & approachable',
    heading: "'Nunito', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap',
    previewHeading: 'Nunito',
    previewBody: 'Nunito',
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Sharp & futuristic',
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Space Grotesk', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    previewHeading: 'Space Grotesk',
    previewBody: 'Space Grotesk',
  },
  {
    id: 'artisan',
    name: 'Artisan',
    description: 'Handcrafted & warm',
    heading: "'Libre Baskerville', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Lato:wght@300;400;700&display=swap',
    previewHeading: 'Libre Baskerville',
    previewBody: 'Lato',
  },
];

export function getFontPair(id: FontPairId | string | null | undefined): FontPair {
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0];
}
