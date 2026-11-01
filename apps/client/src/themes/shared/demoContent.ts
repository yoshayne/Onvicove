import type { ProductData, ServiceData, StaffData, ThemeId } from '../types';
import { defaults as aurora } from '../aurora/config';
import { defaults as bold } from '../bold/config';
import { defaults as bright } from '../bright/config';
import { defaults as brutalist } from '../brutalist/config';
import { defaults as classic } from '../classic/config';
import { defaults as craft } from '../craft/config';
import { defaults as editorial } from '../editorial/config';
import { defaults as lens } from '../lens/config';
import { defaults as magazine } from '../magazine/config';
import { defaults as minimal } from '../minimal/config';
import { defaults as neonTokyo } from '../neon-tokyo/config';
import { defaults as obsidian } from '../obsidian/config';
import { defaults as warm } from '../warm/config';
import { barberPreset, studioPreset, inkPreset, rosterPreset, type BookingFirstPreset } from '../booking-first/presets';

/** Example content a theme can show before the owner has added their own, so the wizard preview looks real */
export interface DemoContent {
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
}

const u = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const withImages = <T extends { imageUrls?: string[] }>(items: T[], images: string[]): T[] =>
  items.map((it, i) => ({ ...it, imageUrls: it.imageUrls?.length ? it.imageUrls : [images[i % images.length]] }));

const person = (id: string, name: string, bio: string, avatar?: string): StaffData => ({ id: `demo-staff-${id}`, name, bio, avatarUrl: avatar });

const BARBERS = [
  person('1', 'Marcus Reed', 'Fades and line-ups.', u('1568602471122-7832951cc4c5', 300)),
  person('2', 'Dre Wallace', 'Scissor work and beards.', u('1507003211169-0a1dd7228f2d', 300)),
  person('3', 'Tito Gomez', 'Kids cuts and designs.', u('1528892952291-009c663ce843', 300)),
];

/** Barber, Studio, Ink and Roster: their presets hold the example services and products, here we add the photos */
function bookingFirst(p: BookingFirstPreset, hero: string, serviceImages: string[], productImages: string[], staff: StaffData[]): DemoContent {
  return {
    heroImageUrl: hero,
    services: withImages(p.services, serviceImages),
    products: withImages(p.products, productImages),
    staff,
  };
}

const PRODUCT_BOTTLES = [u('1553265331-3032aacd1a76'), u('1599447068894-089fabc9876c')];
const SKIN = [u('1620916566398-39f1143ab7be'), u('1556228720-195a672e8a03')];

const DEMO: Record<ThemeId, DemoContent> = {
  editorial, minimal, bold, warm, classic, bright, obsidian, aurora, magazine, brutalist, 'neon-tokyo': neonTokyo, craft, lens,
  barber: bookingFirst(
    barberPreset,
    u('1503951914875-452162b0f3f1', 1600),
    [u('1647140655214-e4a2d914971f'), u('1585747860715-2ba37e788b70'), u('1605497788044-5a32c7078486'), u('1759134198561-e2041049419c')],
    PRODUCT_BOTTLES,
    BARBERS,
  ),
  roster: bookingFirst(
    rosterPreset,
    u('1647140655214-e4a2d914971f', 1600),
    [u('1585747860715-2ba37e788b70'), u('1503951914875-452162b0f3f1'), u('1759134198561-e2041049419c'), u('1605497788044-5a32c7078486')],
    PRODUCT_BOTTLES,
    BARBERS,
  ),
  studio: bookingFirst(
    studioPreset,
    u('1580618672591-eb180b1a973f', 1600),
    [u('1634449571010-02389ed0f9b0'), u('1560869713-7d0a29430803'), u('1774660810725-fb04e002003d'), u('1595475884562-073c30d45670')],
    SKIN,
    [
      person('1', 'Amara Wells', 'Color and cuts.', u('1472747624745-ce92d32d3c24', 300)),
      person('2', 'Jules Carter', 'Braids and styling.', u('1613099084406-4b9140fc780a', 300)),
      person('3', 'Nia Foster', 'Lashes and brows.', u('1673470907547-1c0c6a996095', 300)),
    ],
  ),
  ink: bookingFirst(
    inkPreset,
    u('1568515045052-f9a854d70bfd', 1600),
    [u('1552627019-947c3789ffb5'), u('1597852075234-fd721ac361d3'), u('1769485016772-c5a4234a6be3'), u('1568515045052-f9a854d70bfd')],
    SKIN,
    [person('1', 'Kai Morgan', 'Black and grey realism.', u('1528892952291-009c663ce843', 300)), person('2', 'Rue Hart', 'Fine line and florals.', u('1507003211169-0a1dd7228f2d', 300))],
  ),
};

export function demoContentFor(themeId: ThemeId): DemoContent {
  return DEMO[themeId] ?? DEMO.editorial;
}
