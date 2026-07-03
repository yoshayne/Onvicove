import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import type { ThemeData } from '../types';

interface ContactBlockProps {
  theme: ThemeData;
  /** Text color class or CSS color string — default white */
  textColor?: string;
  /** Muted/secondary color */
  mutedColor?: string;
  /** Whether to use inline styles (for themes that use style props) */
  useInlineStyles?: boolean;
}

export default function ContactBlock({ theme, textColor = 'rgba(255,255,255,0.6)', mutedColor = 'rgba(255,255,255,0.4)', useInlineStyles = false }: ContactBlockProps) {
  const items = [
    { icon: Phone, value: theme.contactPhone, label: 'Phone' },
    { icon: Mail,  value: theme.contactEmail, label: 'Email' },
    { icon: MapPin, value: theme.contactAddress, label: 'Address' },
    { icon: Clock, value: theme.contactHours,  label: 'Hours' },
  ].filter((item) => !!item.value);

  if (items.length === 0) return null;

  if (useInlineStyles) {
    return (
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon size={12} style={{ color: textColor, opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: textColor }}>{value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {items.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center justify-center gap-2">
          <Icon size={12} className="shrink-0 opacity-60" />
          <span className="text-xs">{value}</span>
        </div>
      ))}
    </div>
  );
}
