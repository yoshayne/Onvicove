import type { CSSProperties } from 'react';

interface Props {
  text?: string;
  heading?: string;
  className?: string;
  style?: CSSProperties;
  headingStyle?: CSSProperties;
  textStyle?: CSSProperties;
}

// Renders nothing until the tenant has written something, so toggling "About" on
// never produces an empty heading.
export default function AboutBlock({ text, heading = 'About', className = '', style, headingStyle, textStyle }: Props) {
  if (!text?.trim()) return null;
  return (
    <section id="about" className={`scroll-mt-20 px-6 py-20 ${className}`} style={style}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 style={headingStyle} className="mb-6 text-3xl font-bold md:text-4xl">{heading}</h2>
        <p style={textStyle} className="whitespace-pre-line text-base leading-relaxed opacity-80">{text}</p>
      </div>
    </section>
  );
}
