import type { CSSProperties } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

interface Props {
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
  heading?: string;
  className?: string;
  style?: CSSProperties;
  headingStyle?: CSSProperties;
}

// Contact details from the Page Builder's Content tab. Renders nothing if none are filled in.
export default function ContactBlock({ email, phone, address, hours, heading = 'Get in Touch', className = '', style, headingStyle }: Props) {
  const items = [
    email && { key: 'email', Icon: Mail, label: 'Email', node: <a href={`mailto:${email}`} className="underline underline-offset-4 hover:opacity-70">{email}</a> },
    phone && { key: 'phone', Icon: Phone, label: 'Phone', node: <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="underline underline-offset-4 hover:opacity-70">{phone}</a> },
    address && { key: 'address', Icon: MapPin, label: 'Location', node: <span className="whitespace-pre-line">{address}</span> },
    hours && { key: 'hours', Icon: Clock, label: 'Hours', node: <span className="whitespace-pre-line">{hours}</span> },
  ].filter(Boolean) as { key: string; Icon: typeof Mail; label: string; node: React.ReactNode }[];

  if (items.length === 0) return null;

  return (
    <section id="contact-details" className={`scroll-mt-20 px-6 py-16 ${className}`} style={style}>
      <div className="mx-auto max-w-4xl">
        <h2 style={headingStyle} className="mb-10 text-center text-3xl font-bold md:text-4xl">{heading}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ key, Icon, label, node }) => (
            <div key={key} className="flex flex-col items-center gap-2 text-center">
              <Icon size={20} className="opacity-60" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-50">{label}</span>
              <div className="text-sm leading-relaxed">{node}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
