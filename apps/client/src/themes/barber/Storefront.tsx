import type { ThemeProps } from '../types';
import BookingFirstStorefront from '../booking-first/BookingFirstStorefront';
import { barberPreset } from '../booking-first/presets';

export default function Storefront(props: ThemeProps) {
  return <BookingFirstStorefront preset={barberPreset} {...props} />;
}
