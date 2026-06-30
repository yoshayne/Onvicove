import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export type GalleryLayout =
  | 'grid'
  | 'masonry'
  | 'slideshow'
  | 'carousel'
  | 'before-after'
  | 'editorial'
  | 'lightbox-grid'
  | 'polaroid';

export interface GalleryImageData {
  url: string;
  caption?: string;
}

export interface GallerySectionData {
  id: string;
  type: 'gallery';
  enabled: boolean;
  title?: string;
  layout: GalleryLayout;
  images: GalleryImageData[];
}

export const GALLERY_LAYOUTS: { id: GalleryLayout; label: string; description: string }[] = [
  { id: 'grid', label: 'Grid', description: 'Uniform tiles, classic & reliable' },
  { id: 'masonry', label: 'Masonry', description: 'Pinterest-style variable heights' },
  { id: 'slideshow', label: 'Slideshow', description: 'One large photo, click through' },
  { id: 'carousel', label: 'Carousel', description: 'Horizontal scroll, peek next item' },
  { id: 'before-after', label: 'Before / After', description: 'Drag handle to compare two photos' },
  { id: 'editorial', label: 'Editorial', description: 'Asymmetric magazine-style blocks' },
  { id: 'lightbox-grid', label: 'Lightbox Grid', description: 'Small grid, opens full-screen zoom' },
  { id: 'polaroid', label: 'Polaroid', description: 'Scattered, rotated handmade feel' },
];

// ── Lightbox (shared by grid/masonry/lightbox-grid/polaroid/editorial) ──────────

function Lightbox({
  images, index, onClose, onNav,
}: { images: GalleryImageData[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const img = images[index];
  if (!img) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-white/70 hover:text-white">
        <X size={28} />
      </button>
      {images.length > 1 && (
        <button
          type="button"
          aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); onNav((index - 1 + images.length) % images.length); }}
          className="absolute left-4 text-white/70 hover:text-white"
        >
          <ChevronLeft size={32} />
        </button>
      )}
      <img src={img.url} alt={img.caption ?? ''} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[85vw] object-contain" />
      {images.length > 1 && (
        <button
          type="button"
          aria-label="Next"
          onClick={(e) => { e.stopPropagation(); onNav((index + 1) % images.length); }}
          className="absolute right-4 text-white/70 hover:text-white"
        >
          <ChevronRight size={32} />
        </button>
      )}
      {img.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/80">{img.caption}</p>
      )}
    </div>
  );
}

function BeforeAfter({ images }: { images: GalleryImageData[] }) {
  const [pos, setPos] = useState(50);
  if (images.length < 2) return null;
  const [before, after] = images;
  return (
    <div className="relative mx-auto aspect-video max-w-3xl select-none overflow-hidden rounded-xl">
      <img src={after.url} alt={after.caption ?? 'After'} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before.url} alt={before.caption ?? 'Before'} className="h-full object-cover" style={{ width: `${10000 / pos}%`, maxWidth: 'none' }} />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${pos}%` }} />
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-3 mx-auto w-2/3 accent-white"
        aria-label="Compare slider"
      />
      <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">Before</span>
      <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">After</span>
    </div>
  );
}

function Slideshow({ images }: { images: GalleryImageData[] }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return null;
  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black/5">
        <img src={images[i].url} alt={images[i].caption ?? ''} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => setI((i - 1 + images.length) % images.length)} aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => setI((i + 1) % images.length)} aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white">
            <ChevronRight size={18} />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button key={idx} type="button" aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-300'}`} />
            ))}
          </div>
        </>
      )}
      {images[i].caption && <p className="mt-2 text-center text-sm text-slate-500">{images[i].caption}</p>}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Gallery({ layout, images, title }: { layout: GalleryLayout; images: GalleryImageData[]; title?: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  const heading = title && (
    <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
  );

  if (layout === 'slideshow') {
    return <section className="py-16 px-4">{heading}<Slideshow images={images} /></section>;
  }

  if (layout === 'before-after') {
    return <section className="py-16 px-4">{heading}<BeforeAfter images={images} /></section>;
  }

  if (layout === 'carousel') {
    return (
      <section className="py-16 px-4">
        {heading}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setLightboxIndex(i)}
              className="relative shrink-0 snap-start overflow-hidden rounded-xl" style={{ width: '70%', maxWidth: 360 }}>
              <img src={img.url} alt={img.caption ?? ''} className="aspect-[4/5] w-full object-cover" />
              {img.caption && <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{img.caption}</span>}
            </button>
          ))}
        </div>
        {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      </section>
    );
  }

  if (layout === 'masonry') {
    return (
      <section className="py-16 px-4">
        {heading}
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setLightboxIndex(i)} className="block w-full overflow-hidden rounded-lg break-inside-avoid">
              <img src={img.url} alt={img.caption ?? ''} className="w-full object-cover" />
            </button>
          ))}
        </div>
        {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      </section>
    );
  }

  if (layout === 'editorial') {
    return (
      <section className="py-16 px-4">
        {heading}
        <div className="mx-auto grid max-w-5xl grid-cols-6 gap-3">
          {images.map((img, i) => {
            const big = i % 5 === 0;
            return (
              <button key={i} type="button" onClick={() => setLightboxIndex(i)}
                className={`overflow-hidden rounded-lg ${big ? 'col-span-4 row-span-2' : 'col-span-2'}`}>
                <img src={img.url} alt={img.caption ?? ''} className="aspect-square h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
        {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      </section>
    );
  }

  if (layout === 'polaroid') {
    const rotations = [-4, 3, -2, 5, -5, 2, -3, 4];
    return (
      <section className="py-16 px-4">
        {heading}
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setLightboxIndex(i)}
              className="bg-white p-3 pb-8 shadow-lg transition-transform hover:scale-105 hover:rotate-0"
              style={{ transform: `rotate(${rotations[i % rotations.length]}deg)`, width: 180 }}>
              <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover" />
              {img.caption && <p className="mt-2 text-center text-xs text-slate-600">{img.caption}</p>}
            </button>
          ))}
        </div>
        {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      </section>
    );
  }

  if (layout === 'lightbox-grid') {
    return (
      <section className="py-16 px-4">
        {heading}
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setLightboxIndex(i)} className="group relative aspect-square overflow-hidden rounded-md">
              <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <ZoomIn size={16} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
        {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      </section>
    );
  }

  // default: grid
  return (
    <section className="py-16 px-4">
      {heading}
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <button key={i} type="button" onClick={() => setLightboxIndex(i)} className="overflow-hidden rounded-lg">
            <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover transition-transform hover:scale-105" />
          </button>
        ))}
      </div>
      {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
    </section>
  );
}
