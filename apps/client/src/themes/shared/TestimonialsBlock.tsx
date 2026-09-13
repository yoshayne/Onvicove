import { Star } from 'lucide-react';
import type { TestimonialItem } from '../types';

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  { id: 'default-1', author: 'Sarah M.', role: 'Loyal customer', quote: 'Absolutely love this place — the quality is unmatched and service is always exceptional.', rating: 5 },
  { id: 'default-2', author: 'James T.', role: 'Regular client', quote: 'Been coming here for years. Never disappointed. Highly recommend to anyone looking for the best.', rating: 5 },
  { id: 'default-3', author: 'Priya K.', role: 'New customer', quote: 'Found them online and so glad I did. The whole experience was seamless from booking to finish.', rating: 5 },
];

interface Props {
  testimonials?: TestimonialItem[];
  heading?: string;
  className?: string;
  cardStyle?: React.CSSProperties;
  headingStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  starColor?: string;
}

export default function TestimonialsBlock({
  testimonials,
  heading = 'What Our Clients Say',
  className = '',
  cardStyle,
  headingStyle,
  textStyle,
  starColor = '#f59e0b',
}: Props) {
  const items = (testimonials && testimonials.length > 0) ? testimonials : DEFAULT_TESTIMONIALS;

  return (
    <div className={className}>
      <h2 style={headingStyle} className="text-3xl font-bold mb-10 text-center">
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto px-6">
        {items.map((t) => (
          <div key={t.id} style={cardStyle} className="rounded-2xl p-6 flex flex-col gap-3">
            {t.rating && (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < (t.rating ?? 5) ? starColor : 'transparent'}
                    color={starColor}
                  />
                ))}
              </div>
            )}
            <p style={textStyle} className="text-sm leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p className="font-semibold text-sm">{t.author}</p>
              {t.role && <p className="text-xs opacity-60">{t.role}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
