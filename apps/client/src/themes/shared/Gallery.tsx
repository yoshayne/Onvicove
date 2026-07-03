import { useState, useEffect, useRef, useCallback } from 'react';
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
  { id: 'grid',         label: 'Grid',          description: 'Staggered fade-in tiles' },
  { id: 'masonry',      label: 'Masonry',        description: 'Pinterest-style staggered reveal' },
  { id: 'slideshow',    label: 'Slideshow',      description: 'Auto-advances with crossfade' },
  { id: 'carousel',     label: 'Carousel',       description: 'Auto-scrolls, peek next item' },
  { id: 'before-after', label: 'Before / After', description: 'Animated reveal, drag to compare' },
  { id: 'editorial',    label: 'Editorial',      description: 'Asymmetric magazine-style blocks' },
  { id: 'lightbox-grid',label: 'Lightbox Grid',  description: 'Ripple reveal, opens full-screen' },
  { id: 'polaroid',     label: 'Polaroid',       description: 'Cards drop in with rotation spring' },
];

// ── Keyframes (injected once) ─────────────────────────────────────────────────

const KF_ID = 'gal-keyframes-v2';
if (typeof document !== 'undefined' && !document.getElementById(KF_ID)) {
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes gal-fade-up {
      from { opacity: 0; transform: translateY(28px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes pol-drop {
      0%   { opacity: 0; transform: translateY(-70px) rotate(var(--rot)) scale(0.7); }
      60%  { opacity: 1; transform: translateY(7px)   rotate(var(--rot)) scale(1.05); }
      85%  {             transform: translateY(-3px)  rotate(var(--rot)) scale(0.98); }
      100% {             transform: translateY(0)     rotate(var(--rot)) scale(1);    }
    }
  `;
  document.head.appendChild(s);
}

// ── Hook: staggered IntersectionObserver reveal ───────────────────────────────

function useReveal(count: number, baseDelay = 60) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const i = parseInt(el.dataset.revealIdx ?? '0', 10);
          el.style.animation = `gal-fade-up 0.5s ${i * baseDelay}ms ease both`;
          io.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => {
      el.style.opacity = '0';
      io.observe(el);
    });
    return () => io.disconnect();
  }, [count, baseDelay]);

  return (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
    if (el) el.dataset.revealIdx = String(i);
  };
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  images, index, onClose, onNav,
}: { images: GalleryImageData[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const img = images[index];
  if (!img) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4"
      style={{ animation: 'gal-fade-up 0.2s ease both' }}
      onClick={onClose}
    >
      <button type="button" onClick={onClose} aria-label="Close"
        className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white">
        <X size={28} />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous"
            onClick={(e) => { e.stopPropagation(); onNav((index - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/25">
            <ChevronLeft size={24} />
          </button>
          <button type="button" aria-label="Next"
            onClick={(e) => { e.stopPropagation(); onNav((index + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/25">
            <ChevronRight size={24} />
          </button>
        </>
      )}
      <img
        src={img.url} alt={img.caption ?? ''} onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[85vw] object-contain"
        style={{ animation: 'gal-fade-up 0.25s ease both' }}
      />
      {img.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
          {img.caption}
        </p>
      )}
    </div>
  );
}

// ── Before / After ────────────────────────────────────────────────────────────

function BeforeAfter({ images }: { images: GalleryImageData[] }) {
  const [pos, setPos] = useState(100); // start fully "before", sweep to 50 on mount
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Brief delay so the CSS transition fires as an animation
    const t = setTimeout(() => { setReady(true); setPos(50); }, 400);
    return () => clearTimeout(t);
  }, []);

  if (images.length < 2) return null;
  const [before, after] = images;
  const transition = ready ? 'width 1.4s cubic-bezier(.4,0,.2,1)' : 'none';

  return (
    <div className="relative mx-auto aspect-video max-w-3xl select-none overflow-hidden rounded-xl">
      {/* After layer (always full width underneath) */}
      <img src={after.url} alt={after.caption ?? 'After'} className="absolute inset-0 h-full w-full object-cover" />

      {/* Before layer (clipped by pos%) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%`, transition }}>
        <img
          src={before.url} alt={before.caption ?? 'Before'}
          className="h-full object-cover"
          style={{ width: `${10000 / pos}%`, maxWidth: 'none' }}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
        style={{ left: `${pos}%`, transition: ready ? 'left 1.4s cubic-bezier(.4,0,.2,1)' : 'none' }}
      >
        {/* Handle knob */}
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl">
          <ChevronLeft size={10} className="text-slate-600" />
          <ChevronRight size={10} className="text-slate-600" />
        </div>
      </div>

      {/* Invisible range input for drag */}
      <input
        type="range" min={1} max={99} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        aria-label="Compare slider"
      />

      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">After</span>
    </div>
  );
}

// ── Slideshow (crossfade + auto-advance) ──────────────────────────────────────

function Slideshow({ images }: { images: GalleryImageData[] }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const len = images.length;

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => { setCurrent(next); setFading(false); }, 320);
  }, []);

  useEffect(() => {
    if (paused || len <= 1) return;
    const id = setInterval(() => go((current + 1) % len), 4500);
    return () => clearInterval(id);
  }, [current, paused, len, go]);

  if (!images.length) return null;

  return (
    <div className="relative mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/5">
        <img
          key={current}
          src={images[current].url} alt={images[current].caption ?? ''}
          className="h-full w-full object-cover"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.32s ease' }}
        />
        {/* Progress bar */}
        {len > 1 && !paused && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/30">
            <div
              className="h-full bg-white/80"
              style={{ animation: 'none', width: '100%', transformOrigin: 'left',
                       animationName: 'progress-bar', animationDuration: '4.5s',
                       animationTimingFunction: 'linear', animationFillMode: 'forwards' }}
              key={current}
            />
          </div>
        )}
      </div>

      {len > 1 && (
        <>
          <button type="button" onClick={() => go((current - 1 + len) % len)} aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-all hover:scale-110 hover:bg-white">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => go((current + 1) % len)} aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-all hover:scale-110 hover:bg-white">
            <ChevronRight size={18} />
          </button>
          <div className="mt-3 flex justify-center gap-2">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${i === current ? 'h-1.5 w-6 bg-slate-800' : 'h-1.5 w-1.5 bg-slate-300 hover:bg-slate-500'}`} />
            ))}
          </div>
        </>
      )}
      {images[current].caption && (
        <p className="mt-2 text-center text-sm text-slate-500">{images[current].caption}</p>
      )}
    </div>
  );
}

// ── Carousel (infinite auto-scroll, prev/next) ────────────────────────────────

function Carousel({ images, onOpen }: { images: GalleryImageData[]; onOpen: (i: number) => void }) {
  const len = images.length;
  // Triple the array: [clone-set | real-set | clone-set]
  const items = [...images, ...images, ...images];

  const [idx, setIdx] = useState(len);       // start in the middle real set
  const [anim, setAnim] = useState(false);   // whether CSS transition is on
  const [paused, setPaused] = useState(false);

  // Auto-advance
  useEffect(() => {
    if (paused || len <= 1) return;
    const id = setInterval(() => { setAnim(true); setIdx((i) => i + 1); }, 3200);
    return () => clearInterval(id);
  }, [paused, len]);

  // Snap-back at boundaries (instant, no animation)
  const onTransitionEnd = () => {
    if (idx >= len * 2) { setAnim(false); setIdx(idx - len); }
    else if (idx < len) { setAnim(false); setIdx(idx + len); }
  };

  const prev = () => { setAnim(true); setIdx((i) => i - 1); };
  const next = () => { setAnim(true); setIdx((i) => i + 1); };
  const realIdx = ((idx - len) % len + len) % len;

  // translateX math: each card = 82% of container, no gap (padding inside card)
  // flex row = items.length * 82% of container
  // translateX(-X%) where X = idx * (100 / items.length) % of flex row = idx * 82% of container / flex row
  // = idx * 82 / (items.length * 82) * 100 = idx * 100 / items.length
  const tx = (idx * 100) / items.length;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${tx}%)`,
            transition: anim ? 'transform 0.55s cubic-bezier(.4,0,.2,1)' : 'none',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {items.map((img, i) => {
            const isCenter = i === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onOpen(i % len)}
                style={{ flex: `0 0 82%`, paddingRight: 12 }}
                className={`overflow-hidden rounded-2xl transition-all duration-500 ${isCenter ? 'brightness-100 scale-100' : 'brightness-[0.65] scale-[0.96]'}`}
              >
                <img src={img.url} alt={img.caption ?? ''} className="aspect-[4/5] w-full object-cover" />
                {img.caption && (
                  <span className="block py-2 text-center text-xs text-slate-500">{img.caption}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {len > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Previous"
            className="absolute left-2 top-[40%] -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={next} aria-label="Next"
            className="absolute right-3 top-[40%] -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-white">
            <ChevronRight size={18} />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} type="button"
                onClick={() => { setAnim(true); setIdx(len + i); }}
                aria-label={`Go to ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${i === realIdx ? 'h-1.5 w-5 bg-slate-800' : 'h-1.5 w-1.5 bg-slate-300 hover:bg-slate-500'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Gallery({ layout, images, title }: { layout: GalleryLayout; images: GalleryImageData[]; title?: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const setRef = useReveal(images.length);

  if (images.length === 0) return null;

  const heading = title && (
    <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
  );

  // ── Slideshow ──────────────────────────────────────────────────────────────
  if (layout === 'slideshow') {
    return <section className="px-4 py-16">{heading}<Slideshow images={images} /></section>;
  }

  // ── Before / After ─────────────────────────────────────────────────────────
  if (layout === 'before-after') {
    return <section className="px-4 py-16">{heading}<BeforeAfter images={images} /></section>;
  }

  // ── Carousel ───────────────────────────────────────────────────────────────
  if (layout === 'carousel') {
    return (
      <section className="py-16 px-4">
        {heading}
        <Carousel images={images} onOpen={setLightboxIndex} />
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
        )}
      </section>
    );
  }

  // ── Masonry ────────────────────────────────────────────────────────────────
  if (layout === 'masonry') {
    return (
      <section className="px-4 py-16">
        {heading}
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {images.map((img, i) => (
            <button
              key={i} type="button"
              ref={setRef(i) as React.Ref<HTMLButtonElement>}
              onClick={() => setLightboxIndex(i)}
              className="block w-full overflow-hidden rounded-lg break-inside-avoid transition-transform duration-300 hover:scale-[1.02]"
            >
              <img src={img.url} alt={img.caption ?? ''} className="w-full object-cover" />
            </button>
          ))}
        </div>
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
        )}
      </section>
    );
  }

  // ── Editorial ──────────────────────────────────────────────────────────────
  if (layout === 'editorial') {
    return (
      <section className="px-4 py-16">
        {heading}
        <div className="mx-auto grid max-w-5xl grid-cols-6 gap-3">
          {images.map((img, i) => {
            const big = i % 5 === 0;
            return (
              <button
                key={i} type="button"
                ref={setRef(i) as React.Ref<HTMLButtonElement>}
                onClick={() => setLightboxIndex(i)}
                className={`overflow-hidden rounded-lg transition-transform duration-500 hover:scale-[1.02] ${big ? 'col-span-4 row-span-2' : 'col-span-2'}`}
              >
                <img src={img.url} alt={img.caption ?? ''} className="aspect-square h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
        )}
      </section>
    );
  }

  // ── Polaroid ───────────────────────────────────────────────────────────────
  if (layout === 'polaroid') {
    const rots = [-5, 3, -2, 6, -4, 2, -3, 5, -6, 4];
    return (
      <section className="px-4 py-16">
        {heading}
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 pt-4">
          {images.map((img, i) => {
            const rot = rots[i % rots.length];
            return (
              <button
                key={i} type="button"
                onClick={() => setLightboxIndex(i)}
                className="bg-white p-3 pb-8 shadow-xl"
                style={{
                  width: 180,
                  '--rot': `${rot}deg`,
                  opacity: 0,
                  animation: `pol-drop 0.65s cubic-bezier(.22,.68,0,1.2) ${i * 80}ms both`,
                  transform: `rotate(${rot}deg)`,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.08)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)';
                  (e.currentTarget as HTMLElement).style.zIndex = '10';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = `rotate(${rot}deg) scale(1)`;
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.zIndex = '';
                }}
              >
                <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover" />
                {img.caption && <p className="mt-2 text-center text-[11px] text-slate-500">{img.caption}</p>}
              </button>
            );
          })}
        </div>
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
        )}
      </section>
    );
  }

  // ── Lightbox Grid ──────────────────────────────────────────────────────────
  if (layout === 'lightbox-grid') {
    return (
      <section className="px-4 py-16">
        {heading}
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <button
              key={i} type="button"
              ref={setRef(i) as React.Ref<HTMLButtonElement>}
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-md"
            >
              <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/35">
                <ZoomIn size={18} className="text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
        {lightboxIndex !== null && (
          <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
        )}
      </section>
    );
  }

  // ── Grid (default) ─────────────────────────────────────────────────────────
  return (
    <section className="px-4 py-16">
      {heading}
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={i} type="button"
            ref={setRef(i) as React.Ref<HTMLButtonElement>}
            onClick={() => setLightboxIndex(i)}
            className="overflow-hidden rounded-lg"
          >
            <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover transition-transform duration-400 hover:scale-105" />
          </button>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
      )}
    </section>
  );
}
