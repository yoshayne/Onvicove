import type { ThemeProps } from '../types';
import BookingFirstStorefront from '../booking-first/BookingFirstStorefront';
import { rosterPreset } from '../booking-first/presets';

export default function Storefront(props: ThemeProps) {
  return <BookingFirstStorefront preset={rosterPreset} {...props} />;
}
