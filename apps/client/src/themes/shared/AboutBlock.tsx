import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { AboutConfig } from '../types';

/** Set once by ThemeRenderer so every theme's About section can use the owner's layout, photo and call to action */
export const AboutContext = createContext<AboutConfig | undefined>(undefined);

interface Props {
  text?: string;
  heading?: string;
  className?: string;
  style?: CSSProperties;
  headingStyle?: CSSProperties;
  textStyle?: CSSProperties;
}

const ACCENT = 'var(--brand-color, currentColor)';

/** "More than just a *camera.*" shows the starred words in the brand color */
function Highlighted({ text }: { text: string }): ReactNode {
  return text.split(/(\*[^*]+\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <span key={i} style={{ color: ACCENT }}>{part.slice(1, -1)}</span>
      : <span key={i}>{part}</span>,
  );
}

// Renders nothing until the tenant has written something, so toggling "About" on
// never produces an empty heading.
export default function AboutBlock({ text, heading = 'About', className = '', style, headingStyle, textStyle }: Props) {
  const cfg = useContext(AboutContext) ?? {};
  if (!text?.trim()) return null;

  const title = cfg.heading?.trim() || heading;
  const eyebrow = cfg.eyebrow?.trim();
  const image = cfg.imageUrl;
  const layout = cfg.layout ?? 'centered';
  const hasCta = !!cfg.ctaLabel?.trim();
  const ctaHref = cfg.ctaHref || '#services';

  const eyebrowEl = eyebrow ? (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>{eyebrow}</p>
  ) : null;
  const titleEl = (size: string) => (
    <h2 style={headingStyle} className={`mb-5 font-bold leading-[1.05] ${size}`}><Highlighted text={title} /></h2>
  );
  const bodyEl = (
    <p style={textStyle} className="whitespace-pre-line text-base leading-relaxed opacity-80">{text}</p>
  );

  const cta = hasCta ? (
    <div className="mx-auto mt-14 flex max-w-5xl flex-col items-start justify-between gap-6 border-t pt-10 sm:flex-row sm:items-center" style={{ borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' }}>
      <div>
        {cfg.ctaKicker?.trim() && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{cfg.ctaKicker}</p>}
        {cfg.ctaHeadline?.trim() && <p style={headingStyle} className="text-4xl font-bold leading-none sm:text-5xl"><Highlighted text={cfg.ctaHeadline} /></p>}
      </div>
      <a href={ctaHref} className="inline-flex items-center gap-2 px-7 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand-color, #111111)' }}>
        {cfg.ctaLabel} <span aria-hidden="true">→</span>
      </a>
    </div>
  ) : null;

  let body: ReactNode;
  if (layout === 'banner' && image) {
    // Photo on one side that runs to the edge, big headline on the other
    body = (
      <div className="mx-auto grid max-w-5xl overflow-hidden md:grid-cols-[1.05fr_1fr]">
        <div className="relative min-h-[260px] md:min-h-[360px]">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 55%, rgba(0,0,0,.35))' }} />
        </div>
        <div className="flex flex-col justify-center py-8 md:py-4 md:pl-12">
          {eyebrowEl}
          {titleEl('text-4xl md:text-5xl')}
          {bodyEl}
        </div>
      </div>
    );
  } else if (layout === 'split' && image) {
    body = (
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <img src={image} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover" />
        <div>
          {eyebrowEl}
          {titleEl('text-3xl md:text-4xl')}
          {bodyEl}
        </div>
      </div>
    );
  } else {
    // Centered, with the photo (if any) above the words
    body = (
      <div className="mx-auto max-w-3xl text-center">
        {image && <img src={image} alt="" className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover" />}
        {eyebrowEl}
        {titleEl('text-3xl md:text-4xl')}
        {bodyEl}
      </div>
    );
  }

  return (
    <section id="about" className={`scroll-mt-20 px-6 py-20 ${className}`} style={style}>
      {body}
      {cta}
    </section>
  );
}
