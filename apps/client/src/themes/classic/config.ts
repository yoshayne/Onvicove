import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

// Fonts: "Merriweather" (heading) requires loading Google Fonts in index.html
// (e.g. <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&display=swap" rel="stylesheet">)
// "Georgia" (body) is a system font and needs no extra loading.
export const config: ThemeConfig = {
  id: 'classic',
  name: 'Classic',
  colors: {
    bg: '#ffffff',
    surface: '#f5f5f5',
    text: '#1a3a5c',
    accent: '#c8a850',
    nav: '#1a3a5c',
    hero: '#1a3a5c',
  },
  fonts: {
    heading: 'Merriweather',
    body: 'Georgia',
  },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'Timeless craftsmanship, delivered with distinction.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Heritage Wool Blazer',
      description: 'Tailored in fine merino wool with horn buttons.',
      priceCents: 28900,
      imageUrls: [
        'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Apparel',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Classic Leather Briefcase',
      description: 'Full-grain leather with brass fittings.',
      priceCents: 34500,
      imageUrls: [
        'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Accessories',
    },
    {
      id: 'demo-product-3',
      name: 'Silk Pocket Square Set',
      description: 'Hand-rolled edges, set of three patterns.',
      priceCents: 4500,
      imageUrls: [
        'https://images.unsplash.com/photo-1589810635657-232948472d98?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Accessories',
    },
    {
      id: 'demo-product-4',
      name: 'Oxford Dress Shoes',
      description: 'Hand-stitched calfskin, Goodyear welted.',
      priceCents: 39500,
      imageUrls: [
        'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Footwear',
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Bespoke Tailoring Consultation',
      description: 'One-on-one consultation with our master tailor.',
      priceCents: 12000,
      durationMinutes: 60,
      imageUrls: [
        'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Wardrobe Styling Session',
      description: 'A guided session to refine your professional wardrobe.',
      priceCents: 9000,
      durationMinutes: 45,
      imageUrls: [
        'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Edward Whitmore',
      bio: 'Master tailor with over twenty years of Savile Row experience.',
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'demo-staff-2',
      name: 'Charlotte Reed',
      bio: 'Personal stylist specializing in classic, timeless wardrobes.',
      avatarUrl:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
