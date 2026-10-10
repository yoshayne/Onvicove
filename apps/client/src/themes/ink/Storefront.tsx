import type { ThemeProps } from '../types';
import BookingFirstStorefront from '../booking-first/BookingFirstStorefront';
import { inkPreset } from '../booking-first/presets';

export default function Storefront(props: ThemeProps) {
  return <BookingFirstStorefront preset={inkPreset} {...props} />;
}
