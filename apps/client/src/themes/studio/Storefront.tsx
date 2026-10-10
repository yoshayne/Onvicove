import type { ThemeProps } from '../types';
import BookingFirstStorefront from '../booking-first/BookingFirstStorefront';
import { studioPreset } from '../booking-first/presets';

export default function Storefront(props: ThemeProps) {
  return <BookingFirstStorefront preset={studioPreset} {...props} />;
}
