import type { CSSProperties } from 'react';
import type { StaffData } from '../types';

interface Props {
  staff: StaffData[];
  heading?: string;
  className?: string;
  style?: CSSProperties;
  headingStyle?: CSSProperties;
}

export default function StaffBlock({ staff, heading = 'Meet the Team', className = '', style, headingStyle }: Props) {
  if (staff.length === 0) return null;
  return (
    <section id="team" className={`scroll-mt-20 px-6 py-20 ${className}`} style={style}>
      <div className="mx-auto max-w-5xl">
        <h2 style={headingStyle} className="mb-12 text-center text-3xl font-bold md:text-4xl">{heading}</h2>
        <div className="flex flex-wrap justify-center gap-12">
          {staff.map((m) => (
            <div key={m.id} className="max-w-xs text-center">
              {m.avatarUrl && <img src={m.avatarUrl} alt={m.name} className="mx-auto mb-4 h-24 w-24 rounded-full object-cover" />}
              <h3 className="text-lg font-semibold">{m.name}</h3>
              {m.bio && <p className="mt-2 text-sm leading-relaxed opacity-70">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
