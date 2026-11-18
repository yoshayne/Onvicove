import type { CSSProperties } from 'react';
import type { CustomBlockData } from '../types';

/** One text, image or button block the owner added between sections. It takes its colours from the theme around it. */
function CustomBlock({ block }: { block: CustomBlockData }) {
  const align = block.align ?? 'center';
  const text = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const auto = align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : '';
  const hasButton = !!block.buttonLabel && !!block.buttonHref;
  const external = !!block.buttonHref && /^https?:\/\//i.test(block.buttonHref);

  return (
    <section className={`mx-auto w-full px-6 py-16 md:py-20 ${block.kind === 'image' ? 'max-w-5xl' : 'max-w-3xl'} ${text}`}>
      {block.kind === 'image' && block.imageUrl && (
        <img src={block.imageUrl} alt={block.imageAlt ?? block.title ?? ''} className="mb-6 w-full rounded-lg object-cover" loading="lazy" />
      )}
      {block.title && <h2 className="text-3xl font-bold md:text-4xl">{block.title}</h2>}
      {block.body && <p className={`mt-4 max-w-2xl whitespace-pre-line text-base leading-relaxed opacity-80 md:text-lg ${auto}`}>{block.body}</p>}
      {hasButton && (
        <a
          href={block.buttonHref}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="mt-8 inline-block border-2 border-current px-7 py-3 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-70"
        >
          {block.buttonLabel}
        </a>
      )}
    </section>
  );
}

/** All of the page's custom blocks, each placed where the owner put it (themes lay their sections out with CSS order) */
export default function CustomBlocks({ blocks, ord }: { blocks?: CustomBlockData[]; ord: (id: string) => CSSProperties }) {
  if (!blocks?.length) return null;
  return (
    <>
      {blocks.map((b) => (
        <div key={b.id} style={ord(b.id)}>
          <CustomBlock block={b} />
        </div>
      ))}
    </>
  );
}
