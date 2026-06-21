import { useState, Suspense, lazy, type ComponentType } from 'react';
import type { ThemeId, ThemeProps, ProductData, ServiceData } from '../themes/types';

const THEMES: { id: ThemeId; name: string; desc: string; premium?: boolean }[] = [
  { id: 'editorial', name: 'Editorial', desc: 'Dark luxury, serif headlines' },
  { id: 'minimal', name: 'Minimal', desc: 'Swiss grid, clean whitespace' },
  { id: 'bold', name: 'Bold', desc: 'Streetwear, neon yellow' },
  { id: 'warm', name: 'Warm', desc: 'Wellness & artisan tones' },
  { id: 'classic', name: 'Classic', desc: 'Professional navy & gold' },
  { id: 'bright', name: 'Bright', desc: 'Gen Z beauty, hot pink' },
  { id: 'obsidian', name: 'Obsidian', desc: 'Black luxury, gold accents', premium: true },
  { id: 'aurora', name: 'Aurora', desc: 'Gradient & glassmorphism', premium: true },
  { id: 'magazine', name: 'Magazine', desc: 'Editorial asymmetric grid', premium: true },
  { id: 'brutalist', name: 'Brutalist', desc: 'Raw, bold, unconventional', premium: true },
  { id: 'neon-tokyo', name: 'Neon Tokyo', desc: 'Cyberpunk neon energy', premium: true },
  { id: 'craft', name: 'Craft', desc: 'Handmade paper textures', premium: true },
];

// Per-theme color palette for mini mockups
const MINI_STYLES: Record<ThemeId, {
  bg: string; nav: string; hero: string; accent: string; text: string; subtext: string;
  headingFont: string; bodyFont: string; navText: string;
}> = {
  editorial: {
    bg: '#ffffff', nav: '#1a1a1a', hero: '#1a1a1a', accent: '#d4a96a',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.6)', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  minimal: {
    bg: '#ffffff', nav: '#ffffff', hero: '#ffffff', accent: '#111111',
    text: '#111111', subtext: '#888888', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#111111',
  },
  bold: {
    bg: '#0a0a0a', nav: '#0a0a0a', hero: '#0a0a0a', accent: '#e8ff00',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.5)', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  warm: {
    bg: '#fdf8f3', nav: '#fdf8f3', hero: '#f5e8d8', accent: '#8b5e3c',
    text: '#3d2b1f', subtext: '#7a5c46', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#3d2b1f',
  },
  classic: {
    bg: '#ffffff', nav: '#1a3a5c', hero: '#1a3a5c', accent: '#c8a850',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.65)', headingFont: 'Georgia, serif', bodyFont: 'serif', navText: '#ffffff',
  },
  bright: {
    bg: '#ffffff', nav: '#ffffff', hero: '#f0f0ff', accent: '#ff3cac',
    text: '#1a1a2e', subtext: '#666', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#1a1a2e',
  },
  obsidian: {
    bg: '#000000', nav: '#000000', hero: '#0a0a0a', accent: '#c9a84c',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.5)', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#c9a84c',
  },
  aurora: {
    bg: '#0d0d1a', nav: '#0d0d1a', hero: '#1a0533', accent: '#a78bfa',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.6)', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  magazine: {
    bg: '#f8f6f1', nav: '#f8f6f1', hero: '#f8f6f1', accent: '#1a1a1a',
    text: '#1a1a1a', subtext: '#777777', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#1a1a1a',
  },
  brutalist: {
    bg: '#ffffff', nav: '#ffffff', hero: '#ffffff', accent: '#0000ff',
    text: '#000000', subtext: '#555555', headingFont: 'sans-serif', bodyFont: 'monospace', navText: '#000000',
  },
  'neon-tokyo': {
    bg: '#050510', nav: '#050510', hero: '#050510', accent: '#ff2d9b',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.6)', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  craft: {
    bg: '#f5f0e8', nav: '#f5f0e8', hero: '#ece5d8', accent: '#5c4a32',
    text: '#2c1f14', subtext: '#7a6650', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#2c1f14',
  },
};

// Real seeded images per theme — hero + 3 product thumbnails
const THEME_IMAGES: Record<ThemeId, { hero: string; products: [string, string, string]; heroLabel: string; p1: string; p2: string; p3: string }> = {
  editorial: {
    hero: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Curated Essentials', p1: 'Linen Coat', p2: 'Ceramic Vase', p3: 'Silk Dress',
  },
  minimal: {
    hero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1622618991746-fe6004db3a47?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Less is more.', p1: 'Candle', p2: 'Diffuser', p3: 'Soap',
  },
  bold: {
    hero: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'ELEVATE YOUR LOOK', p1: 'Runners', p2: 'Logo Tee', p3: 'Bag',
  },
  warm: {
    hero: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Made with love', p1: 'Candle', p2: 'Soap Bar', p3: 'Mist',
  },
  classic: {
    hero: 'https://images.unsplash.com/photo-1521590832167-f3a8c1f23ed1?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Excellence Since 1995', p1: 'Hoodie', p2: 'Serum', p3: 'Cream',
  },
  bright: {
    hero: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Glow different ✨', p1: 'Lip Gloss', p2: 'Eye Serum', p3: 'Night Cream',
  },
  obsidian: {
    hero: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Timeless Luxury', p1: 'Pearl Necklace', p2: 'Gold Cuff', p3: 'Timepiece',
  },
  aurora: {
    hero: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Nourish your soul', p1: 'Glow Serum', p2: 'Moon Mist', p3: 'Night Cream',
  },
  magazine: {
    hero: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Capturing moments.', p1: 'Landscape', p2: 'Still Life', p3: 'Urban',
  },
  brutalist: {
    hero: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: "WE SET TRENDS.", p1: 'DROP 001', p2: 'LOGO TEE', p3: 'CARGO',
  },
  'neon-tokyo': {
    hero: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: '未来はここにある', p1: 'Cyber Hoodie', p2: 'Neon Runner', p3: 'Tech Bag',
  },
  craft: {
    hero: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=70',
    products: [
      'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=120&q=60',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=120&q=60',
    ],
    heroLabel: 'Made by hand.', p1: 'Soy Candle', p2: 'Soap Bar', p3: 'Linen Bag',
  },
};

// Per-theme mock data for the full preview — each theme shows content relevant to its aesthetic
const THEME_MOCK_DATA: Record<ThemeId, { companyName: string; tagline: string; industry: string; products: ProductData[]; services: ServiceData[] }> = {
  editorial: {
    companyName: 'Maison Lefèvre', tagline: 'Curated essentials for a considered life.', industry: 'Fashion & Lifestyle',
    products: [
      { id: '1', name: 'Linen Wrap Coat', description: 'Hand-finished outerwear in undyed linen.', priceCents: 24800, imageUrls: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Ceramic Vase No. 3', description: 'Stoneware vessel, matte ash glaze.', priceCents: 8800, imageUrls: ['https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Silk Slip Dress', description: 'Bias-cut silk in deep ink.', priceCents: 19500, imageUrls: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Leather Tote', description: 'Vegetable-tanned, brass hardware.', priceCents: 32000, imageUrls: ['https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'Private Styling Session', description: 'One-hour personal consultation.', priceCents: 15000, durationMinutes: 60 }],
  },
  minimal: {
    companyName: 'Studio Blanc', tagline: 'Clean design. Quiet luxury.', industry: 'Home & Lifestyle',
    products: [
      { id: '1', name: 'Soy Pillar Candle', description: 'Unscented, hand-poured.', priceCents: 3200, imageUrls: ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Reed Diffuser', description: 'White tea & cedar, 100ml.', priceCents: 4800, imageUrls: ['https://images.unsplash.com/photo-1622618991746-fe6004db3a47?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Linen Throw', description: 'Stonewashed Belgian linen.', priceCents: 8900, imageUrls: ['https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Ceramic Mug', description: 'Matte white, handthrown.', priceCents: 2400, imageUrls: ['https://images.unsplash.com/photo-1595429035839-c99c298ffdde?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [],
  },
  bold: {
    companyName: 'HYPEDROP', tagline: 'Elevate your look.', industry: 'Streetwear',
    products: [
      { id: '1', name: 'OVERSIZED HOODIE', description: 'Heavyweight 400gsm cotton.', priceCents: 18500, imageUrls: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'NEON RUNNERS', description: 'Limited drop, size 7–13.', priceCents: 24500, imageUrls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'LOGO TEE', description: 'Oversized fit, screen print.', priceCents: 8500, imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'UTILITY BAG', description: 'Waxed canvas, 20L.', priceCents: 12000, imageUrls: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [],
  },
  warm: {
    companyName: 'Botanica Co.', tagline: 'Slow made. Deeply nourishing.', industry: 'Wellness & Apothecary',
    products: [
      { id: '1', name: 'Lavender Soy Candle', description: 'Small batch, 40+ hour burn.', priceCents: 3400, imageUrls: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Botanical Soap', description: 'Cold-process, calendula & oat.', priceCents: 1200, imageUrls: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Face Mist', description: 'Rose & hyaluronic, 50ml.', priceCents: 2800, imageUrls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Herbal Tea Blend', description: 'Chamomile, lemon balm & oat.', priceCents: 1800, imageUrls: ['https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'Candle Making Workshop', description: 'Small group, hands-on, 2 hours.', priceCents: 7500, durationMinutes: 120 }],
  },
  classic: {
    companyName: 'Hartwell & Co.', tagline: 'Professional excellence since 1995.', industry: 'Professional Services',
    products: [
      { id: '1', name: 'Executive Portfolio', description: 'Full-grain leather, monogrammed.', priceCents: 45000, imageUrls: ['https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Classic Fountain Pen', description: 'Matte black, 18k gold nib.', priceCents: 28000, imageUrls: ['https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Business Card Holder', description: 'Polished stainless steel.', priceCents: 8500, imageUrls: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Merino Dress Socks', description: 'Set of 3, navy & charcoal.', priceCents: 4200, imageUrls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'Strategy Consultation', description: 'Executive advisory, 90 minutes.', priceCents: 75000, durationMinutes: 90 }],
  },
  bright: {
    companyName: 'Glow Lab', tagline: 'Beauty that plays.', industry: 'Beauty & Skincare',
    products: [
      { id: '1', name: 'Juicy Lip Gloss', description: 'High shine, 8 shades.', priceCents: 2400, imageUrls: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Glow Serum', description: 'Vitamin C + niacinamide.', priceCents: 5600, imageUrls: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Cloud Moisturizer', description: 'Lightweight gel, all skin types.', priceCents: 4200, imageUrls: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Mini Serum Set', description: '4 bestsellers in trial size.', priceCents: 3800, imageUrls: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'Glow Facial', description: 'LED + enzyme peel, 60 min.', priceCents: 9500, durationMinutes: 60 }],
  },
  obsidian: {
    companyName: 'ÉLEVE', tagline: 'Timeless luxury. Expertly crafted.', industry: 'Fine Jewelry',
    products: [
      { id: '1', name: 'Diamond Solitaire Ring', description: 'Hand-set brilliant cut, 18k gold.', priceCents: 450000, imageUrls: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Black Pearl Necklace', description: 'South Sea pearl, platinum chain.', priceCents: 285000, imageUrls: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Gold Cuff Bracelet', description: 'Hammered 22k gold, artisan finish.', priceCents: 195000, imageUrls: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Obsidian Timepiece', description: 'Swiss movement, sapphire crystal.', priceCents: 895000, imageUrls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'Private Consultation', description: 'One-on-one with our master jeweler.', priceCents: 50000, durationMinutes: 60 }],
  },
  aurora: {
    companyName: 'LUMINA', tagline: 'Nourish your body, mind & soul.', industry: 'Holistic Wellness',
    products: [
      { id: '1', name: 'Crystal Glow Serum', description: 'Radiance-boosting vitamin C complex.', priceCents: 8900, imageUrls: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Moon Mist Toner', description: 'Balancing rosewater mist.', priceCents: 4500, imageUrls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Nebula Night Cream', description: 'Deep repair with peptides.', priceCents: 7200, imageUrls: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Aurora Eye Elixir', description: 'Brightening caffeine eye treatment.', priceCents: 5600, imageUrls: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [
      { id: 's1', name: 'Holistic Facial', description: 'Crystal energy + LED therapy, 75 min.', priceCents: 14500, durationMinutes: 75 },
      { id: 's2', name: 'Sound Bath Session', description: 'Deep relaxation with crystal bowls.', priceCents: 8500, durationMinutes: 60 },
      { id: 's3', name: 'Reiki Healing', description: 'Energy balancing and chakra alignment.', priceCents: 9500, durationMinutes: 60 },
    ],
  },
  magazine: {
    companyName: 'Studio Noir', tagline: 'Capturing moments. Telling stories.', industry: 'Photography',
    products: [
      { id: '1', name: 'Portrait Print', description: 'Fine art, archival paper, signed.', priceCents: 32000, imageUrls: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Landscape Series', description: 'Limited edition, numbered 1–50.', priceCents: 48000, imageUrls: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Still Life No. 7', description: 'Medium format film, gallery wrap.', priceCents: 25000, imageUrls: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Urban Study', description: 'Street photography series, set of 3.', priceCents: 18000, imageUrls: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [
      { id: 's1', name: 'Portrait Session', description: 'Studio or location, 2-hour shoot.', priceCents: 65000, durationMinutes: 120 },
      { id: 's2', name: 'Brand Photography', description: 'Full-day editorial shoot.', priceCents: 150000, durationMinutes: 480 },
    ],
  },
  brutalist: {
    companyName: 'RAW STUDIO', tagline: "We don't follow trends. We set them.", industry: 'Creative Agency',
    products: [
      { id: '1', name: 'DROP 001 HOODIE', description: 'Heavyweight cotton, garment-washed.', priceCents: 18500, imageUrls: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'LOGO TEE V3', description: 'Oversized, screen-printed.', priceCents: 8500, imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'CARGO PANTS', description: 'Multi-pocket, raw hem.', priceCents: 22000, imageUrls: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'CHAIN WALLET', description: 'Welded steel, heavy duty.', priceCents: 6500, imageUrls: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [
      { id: 's1', name: 'BRAND IDENTITY', description: 'Logo, palette, type system.', priceCents: 500000, durationMinutes: 0 },
      { id: 's2', name: 'CAMPAIGN SHOOT', description: 'Full creative direction + photography.', priceCents: 350000, durationMinutes: 480 },
    ],
  },
  'neon-tokyo': {
    companyName: 'TOKYO SUPPLY', tagline: 'Next-gen gear. Built for the streets.', industry: 'Urban Fashion',
    products: [
      { id: '1', name: 'Cyber Hoodie', description: 'Reflective piping, thermal lining.', priceCents: 18900, imageUrls: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Neon Runner', description: 'Limited drop, air-cushioned sole.', priceCents: 24500, imageUrls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Tech Bag', description: 'Waterproof shell, modular.', priceCents: 12000, imageUrls: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Glitch Cap', description: 'Structured, iridescent brim.', priceCents: 5500, imageUrls: ['https://images.unsplash.com/photo-1556306535-38febf6cdbe1?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [{ id: 's1', name: 'VIP Drop Access', description: 'Early access to all limited releases.', priceCents: 9900, durationMinutes: 0 }],
  },
  craft: {
    companyName: 'Willow & Co.', tagline: 'Made by hand. Made to love.', industry: 'Handmade Goods',
    products: [
      { id: '1', name: 'Beeswax Taper Set', description: 'Hand-dipped, 100% natural beeswax.', priceCents: 2800, imageUrls: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80'], isFeatured: true },
      { id: '2', name: 'Lavender Soy Candle', description: 'Small batch, 40+ hour burn.', priceCents: 3400, imageUrls: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80'] },
      { id: '3', name: 'Botanical Soap Bar', description: 'Cold-process, calendula + oat.', priceCents: 1200, imageUrls: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80'] },
      { id: '4', name: 'Linen Gift Bag', description: 'Natural linen, hand-stamped.', priceCents: 1800, imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80'] },
    ],
    services: [
      { id: 's1', name: 'Candle Making Workshop', description: 'Small group, 2-hour class.', priceCents: 7500, durationMinutes: 120 },
      { id: 's2', name: 'Custom Scent Blending', description: 'Create your signature fragrance.', priceCents: 9500, durationMinutes: 90 },
    ],
  },
};

const themeLoaders: Record<ThemeId, () => Promise<{ default: ComponentType<ThemeProps> }>> = {
  editorial: () => import('../themes/editorial/Storefront'),
  minimal: () => import('../themes/minimal/Storefront'),
  bold: () => import('../themes/bold/Storefront'),
  warm: () => import('../themes/warm/Storefront'),
  classic: () => import('../themes/classic/Storefront'),
  bright: () => import('../themes/bright/Storefront'),
  obsidian: () => import('../themes/obsidian/Storefront'),
  aurora: () => import('../themes/aurora/Storefront'),
  magazine: () => import('../themes/magazine/Storefront'),
  brutalist: () => import('../themes/brutalist/Storefront'),
  'neon-tokyo': () => import('../themes/neon-tokyo/Storefront'),
  craft: () => import('../themes/craft/Storefront'),
};

function MiniMockup({ id }: { id: ThemeId }) {
  const s = MINI_STYLES[id];
  const imgs = THEME_IMAGES[id];

  const isBrutalist = id === 'brutalist';
  const isNeonTokyo = id === 'neon-tokyo';
  const isMagazine = id === 'magazine';
  const isBold = id === 'bold';
  const isObsidian = id === 'obsidian';
  const isAurora = id === 'aurora';
  const isCraft = id === 'craft';

  const navBorder = id === 'minimal' || id === 'magazine' || id === 'craft'
    ? `1px solid ${id === 'craft' ? '#c4b49a' : '#e5e5e5'}`
    : isBrutalist ? '3px solid #000' : 'none';

  return (
    <div style={{ background: s.bg, fontFamily: s.bodyFont, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Aurora animated gradient overlay */}
      {isAurora && (
        <style>{`@keyframes mini-aurora { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`}</style>
      )}

      {/* Nav */}
      <div style={{
        background: isAurora ? 'rgba(13,13,26,0.8)' : s.nav,
        borderBottom: navBorder,
        padding: isBrutalist ? '5px 8px' : '5px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['●', '●', '●'].map((d, i) => (
            <span key={i} style={{ fontSize: 3.5, opacity: i === 0 ? 1 : 0.35, color: s.accent }}>{d}</span>
          ))}
        </div>
        <span style={{
          fontFamily: s.headingFont,
          fontSize: isBrutalist ? 7 : 6.5,
          fontWeight: isBrutalist ? 900 : 700,
          color: s.navText,
          letterSpacing: id === 'editorial' || id === 'classic' || id === 'obsidian' ? '0.12em'
            : isNeonTokyo ? '0.08em' : '0.02em',
          textTransform: isBrutalist || id === 'editorial' || id === 'classic' || id === 'obsidian' ? 'uppercase' : 'none',
          background: isAurora ? 'linear-gradient(90deg, #a78bfa, #60a5fa)' : 'none',
          WebkitBackgroundClip: isAurora ? 'text' : 'unset',
          WebkitTextFillColor: isAurora ? 'transparent' : 'unset',
        }}>
          {THEME_MOCK_DATA[id].companyName}
        </span>
        <div style={{
          width: 5, height: 5,
          borderRadius: isBrutalist ? 0 : '50%',
          background: s.accent,
          opacity: 0.8,
          border: isBrutalist ? '1.5px solid #000' : 'none',
        }} />
      </div>

      {/* Hero section with real image */}
      <div style={{
        position: 'relative',
        height: isMagazine ? 64 : 72,
        overflow: 'hidden',
        flexShrink: 0,
        background: isAurora
          ? 'linear-gradient(-45deg,#0d0d1a,#1a0533,#0a2040,#150d2e)'
          : s.hero,
        backgroundSize: isAurora ? '400% 400%' : 'auto',
        animation: isAurora ? 'mini-aurora 12s ease infinite' : 'none',
      }}>
        {/* Hero image */}
        {!isAurora && (
          <img
            src={imgs.hero}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: id === 'editorial' || id === 'classic' || id === 'obsidian' ? 0.55
                : isNeonTokyo ? 0.3
                : isBrutalist ? 0.5
                : isMagazine ? 1
                : isCraft ? 1
                : 0.7,
              mixBlendMode: isNeonTokyo ? 'screen' : 'normal',
            }}
          />
        )}
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: id === 'editorial' || id === 'classic' || id === 'obsidian'
            ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)'
            : isNeonTokyo
              ? 'linear-gradient(to right, rgba(5,5,16,0.85) 40%, transparent 100%)'
              : isBrutalist
                ? 'none'
                : isMagazine
                  ? 'linear-gradient(to right, rgba(248,246,241,0.85) 40%, transparent 100%)'
                  : isCraft
                    ? 'linear-gradient(to right, rgba(245,240,232,0.85) 40%, transparent 100%)'
                    : 'none',
        }} />
        {/* Hero text overlay */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: isMagazine || isCraft ? '8px 8px' : '10px 8px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%',
        }}>
          <div style={{
            fontFamily: s.headingFont,
            fontSize: isBold ? 9 : isBrutalist ? 10 : 7.5,
            fontWeight: isBrutalist ? 900 : 800,
            color: isMagazine ? '#1a1a1a' : isCraft ? '#2c1f14' : s.text,
            lineHeight: 1.1,
            letterSpacing: isBold ? '-0.02em' : isBrutalist ? '-0.03em' : id === 'editorial' || id === 'classic' || id === 'obsidian' ? '0.04em' : 'normal',
            textTransform: isBold || isBrutalist ? 'uppercase' : 'none',
            marginBottom: 4,
            textShadow: isNeonTokyo ? '0 0 8px #ff2d9b' : 'none',
          }}>
            {imgs.heroLabel}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <div style={{
              background: s.accent,
              color: isBold || isBrutalist ? '#000' : id === 'magazine' ? '#f8f6f1' : '#fff',
              fontSize: 4,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: isBrutalist || id === 'minimal' ? 0 : 3,
              letterSpacing: isBold || isBrutalist ? '0.08em' : 'normal',
              textTransform: isBold || isBrutalist ? 'uppercase' : 'none',
              boxShadow: isNeonTokyo ? '0 0 6px #ff2d9b' : 'none',
            }}>
              {showProducts(id) ? 'Shop' : 'Book'}
            </div>
            {showBoth(id) && (
              <div style={{
                border: `1px solid ${s.accent}`,
                color: s.accent,
                fontSize: 4,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: isBrutalist ? 0 : 3,
              }}>
                Book
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product grid with real images */}
      <div style={{
        padding: '6px 8px',
        background: isAurora ? '#1a1a2e' : id === 'obsidian' ? '#0a0a0a' : isNeonTokyo ? '#0a0a20' : s.bg,
        flex: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 4.5,
          fontWeight: 700,
          color: isBold || isNeonTokyo ? s.accent : id === 'obsidian' ? '#c9a84c' : id === 'magazine' || isCraft ? '#1a1a1a' : isBrutalist ? '#000' : s.text === '#ffffff' ? '#aaa' : '#555',
          marginBottom: 4,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textShadow: isNeonTokyo ? '0 0 6px #ff2d9b' : 'none',
        }}>
          {isBrutalist ? 'THE DROP' : isMagazine ? 'Portfolio' : isCraft ? 'From the Workshop' : 'Featured'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
          {imgs.products.map((src, i) => (
            <div key={i} style={{
              borderRadius: isBrutalist || id === 'minimal' || id === 'magazine' ? 0 : isAurora ? 6 : 3,
              overflow: 'hidden',
              border: isBrutalist ? '1.5px solid #000'
                : isNeonTokyo ? '1px solid rgba(255,45,155,0.3)'
                : id === 'minimal' ? '1px solid #e5e5e5'
                : id === 'obsidian' ? '1px solid rgba(201,168,76,0.2)'
                : isAurora ? '1px solid rgba(167,139,250,0.2)'
                : isCraft ? '1px solid #c4b49a'
                : 'none',
              background: isBrutalist ? '#f0f0f0' : id === 'obsidian' ? '#111' : isAurora ? 'rgba(255,255,255,0.05)' : isNeonTokyo ? '#0d0d2a' : isCraft ? '#ece5d8' : '#f5f5f5',
            }}>
              <div style={{ height: 18, overflow: 'hidden' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ padding: '2px 3px 3px' }}>
                <div style={{
                  fontSize: 3.5,
                  fontWeight: isBrutalist ? 900 : 600,
                  color: id === 'obsidian' ? '#fff' : isAurora ? '#fff' : isNeonTokyo ? '#fff' : isBrutalist ? '#000' : isMagazine ? '#1a1a1a' : isCraft ? '#2c1f14' : s.text === '#ffffff' ? '#ccc' : '#222',
                  lineHeight: 1.2,
                  textTransform: isBrutalist ? 'uppercase' : 'none',
                  letterSpacing: isBrutalist ? '0.05em' : 'none',
                }}>
                  {[imgs.p1, imgs.p2, imgs.p3][i]}
                </div>
                <div style={{
                  fontSize: 3.5,
                  color: s.accent,
                  fontWeight: 700,
                  marginTop: 1,
                  textShadow: isNeonTokyo ? '0 0 4px #ff2d9b' : 'none',
                }}>$89</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function showProducts(id: ThemeId) {
  return true; // all themes support products in showcase
}

function showBoth(id: ThemeId) {
  return ['editorial', 'warm', 'classic', 'bright', 'aurora', 'magazine', 'craft'].includes(id);
}

function FullPreview({ themeId }: { themeId: ThemeId }) {
  const loader = themeLoaders[themeId];
  const Storefront = lazy(loader);
  const mock = THEME_MOCK_DATA[themeId];

  return (
    <div style={{ ['--brand-color' as string]: MINI_STYLES[themeId].accent }}>
      <Suspense fallback={
        <div className="flex min-h-[400px] items-center justify-center text-slate-400">
          Loading theme…
        </div>
      }>
        <Storefront
          theme={{
            companyName: mock.companyName,
            tagline: mock.tagline,
            mode: mock.services.length > 0 && mock.products.length > 0 ? 'both'
              : mock.services.length > 0 ? 'book' : 'store',
            brandColor: MINI_STYLES[themeId].accent,
            industry: mock.industry,
            themeId,
          }}
          products={mock.products}
          services={mock.services}
          staff={[]}
        />
      </Suspense>
    </div>
  );
}

export default function ThemeShowcase() {
  const [tab, setTab] = useState<'grid' | 'full'>('grid');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('editorial');

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight">Twelve stunning themes</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
        Six free themes for every brand. Six next-level premium themes for Pro & Business plans.
      </p>

      {/* Tab switcher */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('grid')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All themes
          </button>
          <button
            type="button"
            onClick={() => setTab('full')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'full' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Full preview
          </button>
        </div>
      </div>

      {tab === 'grid' && (
        <>
          {/* Free themes */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.filter((t) => !t.premium).map((t) => (
              <div
                key={t.id}
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                onClick={() => { setActiveTheme(t.id); setTab('full'); }}
              >
                <div className="h-48 overflow-hidden">
                  <MiniMockup id={t.id} />
                </div>
                <div className="border-t border-slate-100 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                  <p className="mt-1.5 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">Preview →</p>
                </div>
              </div>
            ))}
          </div>

          {/* Premium themes */}
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                ★ Pro &amp; Business Only
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {THEMES.filter((t) => t.premium).map((t) => (
                <div
                  key={t.id}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-amber-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => { setActiveTheme(t.id); setTab('full'); }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <MiniMockup id={t.id} />
                    <span className="absolute top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-black uppercase tracking-wide shadow-sm">
                      PRO
                    </span>
                  </div>
                  <div className="border-t border-amber-100 bg-amber-50/40 p-3">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.desc}</p>
                    <p className="mt-1.5 text-xs font-medium text-amber-600 group-hover:text-amber-700 transition-colors">Preview →</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'full' && (
        <div className="mt-8">
          {/* Theme pill switcher — free row then premium row */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap justify-center gap-2">
              {THEMES.filter((t) => !t.premium).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTheme(t.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    activeTheme === t.id ? 'shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={activeTheme === t.id ? { background: MINI_STYLES[t.id].accent, color: t.id === 'bold' ? '#000' : '#fff' } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {THEMES.filter((t) => t.premium).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTheme(t.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ring-1 ring-amber-200 ${
                    activeTheme === t.id ? 'shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                  style={activeTheme === t.id ? { background: MINI_STYLES[t.id].accent, color: ['bold', 'brutalist', 'magazine', 'craft'].includes(t.id) ? '#000' : '#fff', outline: 'none' } : {}}
                >
                  ★ {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Browser-chrome frame */}
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 rounded-md bg-white px-3 py-1 text-center text-xs text-slate-400 border border-slate-200">
                {THEME_MOCK_DATA[activeTheme].companyName.toLowerCase().replace(/\s+/g, '')}.shopsuitedirect.com
              </div>
            </div>
            <div className="h-[640px] overflow-y-auto">
              <FullPreview key={activeTheme} themeId={activeTheme} />
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            Each preview shows sample content tailored to that theme's industry. Your real products and services will appear on your live site.
          </p>
        </div>
      )}
    </section>
  );
}
