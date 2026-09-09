export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;

  /** The lighter brand tone, for the wordmark and app mark. Large text only. */
  brand: string;

  accent: string;
  accentSoft: string;

  success: string;
  successSoft: string;

  danger: string;
  dangerSoft: string;

  warning: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;

  surface: string;
  surfaceAlt: string;
  background: string;

  border: string;
  borderStrong: string;

  overlay: string;

  place: string;
  selection: string;

  /** Lakes and sea on the basemap. Blue, whatever colour the brand is. */
  water: string;

  route: string;
  routeCasing: string;
  transitRoute: string;
  transitRouteCasing: string;
  walkingRoute: string;
  walkingRouteCasing: string;
}

// A palette family is a light scheme and a dark one that go together. The app
// wears one of them — `ACTIVE_PALETTE` below — and `lightColors` / `darkColors`
// are that choice, which is what every other file reads.
//
// The constraints below hold for *every* family in this file, not only the one
// in use: `npm run check:contrast` walks all of them, so a family sitting here
// unused cannot rot into one that is unreadable the day someone switches to it.
//
//   - Stop pins colour by position (MapSection): the start uses `success`,
//     the destination `accent`, the stops between them `route`, and a place
//     found along the way `place`. All four are on screen at once, so they
//     stay far apart in hue. `primary` is deliberately not among them: a
//     brand-coloured pin reads as the start of the route. `warning` is out for
//     the same reason on the red side — it sits 33° from `accent` and reads as
//     a second destination.
//   - `selection` marks the two stops being compared, on the map and in the
//     list alike. It temporarily replaces whichever of the four a pin would
//     otherwise use, so it is a fifth hue kept clear of them all.
//   - The three route modes are drawn over the same map, and each casing is a
//     lighter halo of its own hue holding >= 3:1 against the line it outlines.
//   - `primary` is used for small label text (links, secondary buttons), so it
//     holds >= 4.5:1 against `surface`, `background`, `surfaceAlt` and
//     `primarySoft` — the last of those is what secondary buttons are filled
//     with, and it is the one that constrains how light `primary` may go.
//   - `text` and `textMuted` clear 4.5:1 on all three backgrounds, and
//     `textSubtle` — which only ever labels something already shown another
//     way — clears 3:1. `brand` is display-sized only, so it clears 3:1.
//   - `water` is the one basemap colour that never follows the brand — a green
//     or indigo sea reads as land. It stays blue, separated from `background`
//     so the coast is visible, and far enough from `route` that a line drawn
//     across a lake still holds 3:1.
//
// The map colours — the four pins, `selection`, the three route modes, `water`
// — are about reading a map, not about the brand, so families share them
// unless a family has a reason not to.

// Forest: Google's greens on the same cool neutrals — Green 800 for the fills
// and small label text, Green 600 as the brighter `brand`.
//
// It used to be a much darker, blue-cast pine (#155F40) on warm paper, which
// read as heavy next to everything else on screen. The hue moved from ~157°
// to ~140°, which is the difference between a pine and a green.
export const forestLight: ThemeColors = {
  primary: '#146C2E',
  primaryDark: '#0D5122',
  primarySoft: '#E6F4EA',

  brand: '#1E8E3E',

  accent: '#D93025',
  accentSoft: '#FCE8E6',

  success: '#137333',
  successSoft: '#E6F4EA',

  danger: '#C5221F',
  dangerSoft: '#FCE8E6',

  warning: '#B06000',

  text: '#202124',
  textMuted: '#5F6368',
  textSubtle: '#80868B',
  textInverse: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F4',
  background: '#F8F9FA',

  border: '#DADCE0',
  borderStrong: '#BDC1C6',

  overlay: 'rgba(32, 33, 36, 0.45)',

  place: '#5B7F00',
  selection: '#7B1FA2',

  water: '#D3E3F1',

  route: '#1967D2',
  routeCasing: '#AECBFA',
  transitRoute: '#9334E6',
  transitRouteCasing: '#E9D2FD',
  walkingRoute: '#137333',
  walkingRouteCasing: '#A8DAB5',
};

export const forestDark: ThemeColors = {
  primary: '#81C995',
  primaryDark: '#A8DAB5',
  primarySoft: '#14331F',

  brand: '#81C995',

  accent: '#F28B82',
  accentSoft: '#3C1F1C',

  success: '#81C995',
  successSoft: '#12301D',

  danger: '#F28B82',
  dangerSoft: '#3C1F1C',

  warning: '#FDD663',

  text: '#E8EAED',
  textMuted: '#ADB3B9',
  textSubtle: '#9AA0A6',
  textInverse: '#0B1F12',

  surface: '#303134',
  surfaceAlt: '#3C4043',
  background: '#202124',

  border: '#4A4D51',
  borderStrong: '#5F6368',

  overlay: 'rgba(0, 0, 0, 0.7)',

  place: '#C5D96B',
  selection: '#D7AEFB',

  water: '#1D3143',

  route: '#8AB4F8',
  routeCasing: '#1F3A63',
  transitRoute: '#D7AEFB',
  transitRouteCasing: '#4A2A6B',
  walkingRoute: '#81C995',
  walkingRouteCasing: '#17492C',
};

// Maps: Google's own Material tones — Blue 700 on Google's cool greys, with
// Blue 600 as the brighter `brand` beside it. This is the family the app
// wears.
//
// `primary` is Blue **700** (#1967D2) rather than the Blue 600 (#1A73E8)
// Google fills its buttons with, because it also sets small label text on
// `primarySoft`. Blue 600 reaches 4.51:1 on pure white and nothing above that
// — any tint at all puts it under 4.5 — so 600 lives in `brand`, which is
// display-sized only.
//
// One honest exception to the pin rule above: `primary` and `route` are the
// same blue here, so the stops between the ends really are brand-coloured.
// That is what Google Maps looks like, and the four pin hues still separate
// by 60°, so it is a deliberate borrow rather than an oversight.

export const mapsLight: ThemeColors = {
  primary: '#1967D2',
  primaryDark: '#174EA6',
  primarySoft: '#E8F0FE',

  brand: '#1A73E8',

  accent: '#D93025',
  accentSoft: '#FCE8E6',

  success: '#137333',
  successSoft: '#E6F4EA',

  danger: '#C5221F',
  dangerSoft: '#FCE8E6',

  warning: '#B06000',

  text: '#202124',
  textMuted: '#5F6368',
  textSubtle: '#80868B',
  textInverse: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F4',
  background: '#F8F9FA',

  border: '#DADCE0',
  borderStrong: '#BDC1C6',

  overlay: 'rgba(32, 33, 36, 0.45)',

  place: '#5B7F00',
  selection: '#7B1FA2',

  water: '#D3E3F1',

  route: '#1967D2',
  routeCasing: '#AECBFA',
  transitRoute: '#9334E6',
  transitRouteCasing: '#E9D2FD',
  walkingRoute: '#137333',
  walkingRouteCasing: '#A8DAB5',
};

export const mapsDark: ThemeColors = {
  primary: '#8AB4F8',
  primaryDark: '#AECBFA',
  primarySoft: '#1A3050',

  brand: '#8AB4F8',

  accent: '#F28B82',
  accentSoft: '#3C1F1C',

  success: '#81C995',
  successSoft: '#12301D',

  danger: '#F28B82',
  dangerSoft: '#3C1F1C',

  warning: '#FDD663',

  text: '#E8EAED',
  textMuted: '#ADB3B9',
  textSubtle: '#9AA0A6',
  textInverse: '#202124',

  surface: '#303134',
  surfaceAlt: '#3C4043',
  background: '#202124',

  border: '#4A4D51',
  borderStrong: '#5F6368',

  overlay: 'rgba(0, 0, 0, 0.7)',

  place: '#C5D96B',
  selection: '#D7AEFB',

  water: '#1D3143',

  route: '#8AB4F8',
  routeCasing: '#1F3A63',
  transitRoute: '#D7AEFB',
  transitRouteCasing: '#4A2A6B',
  walkingRoute: '#81C995',
  walkingRouteCasing: '#17492C',
};

// Harbour: a deep indigo on cool paper — the same app after dark, or on a
// different day. It exists so the design is not welded to one hue: everything
// outside this file reads `primary`, `brand` and the neutrals, so a family is
// the whole reskin.
//
// Indigo rather than a third green: at ~236° it is far enough from forest's
// ~140° that the two read as different apps, while still clearing `route`
// blue (~215°) and `selection` violet (~272°) by enough that neither the map
// nor the compared pair goes muddy against the chrome.

export const harbourLight: ThemeColors = {
  primary: '#4A50A8',
  primaryDark: '#343A83',
  primarySoft: '#E8EAF7',

  brand: '#6A70C4',

  accent: '#C5372A',
  accentSoft: '#FBEAE7',

  success: '#14733A',
  successSoft: '#E6F4EA',

  danger: '#C5221F',
  dangerSoft: '#FBEAE7',

  warning: '#9A5B00',

  text: '#1B1C24',
  textMuted: '#585C69',
  textSubtle: '#737786',
  textInverse: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceAlt: '#EFEFF5',
  background: '#F8F8FB',

  border: '#E2E2EC',
  borderStrong: '#C3C4D2',

  overlay: 'rgba(19, 20, 32, 0.45)',

  place: '#5B7F00',
  selection: '#7B1FA2',

  water: '#D3E3F1',

  route: '#1967D2',
  routeCasing: '#AECBFA',
  transitRoute: '#9334E6',
  transitRouteCasing: '#E9D2FD',
  walkingRoute: '#137333',
  walkingRouteCasing: '#A8DAB5',
};

export const harbourDark: ThemeColors = {
  primary: '#9EA5F0',
  primaryDark: '#BFC3F7',
  primarySoft: '#24263F',

  brand: '#9EA5F0',

  accent: '#F08A80',
  accentSoft: '#3B1F1C',

  success: '#7BC894',
  successSoft: '#12301D',

  danger: '#F08A80',
  dangerSoft: '#3B1F1C',

  warning: '#FDD663',

  text: '#E7E8F0',
  textMuted: '#A9ACBC',
  textSubtle: '#8A8E9E',
  textInverse: '#14162B',

  surface: '#1D1E26',
  surfaceAlt: '#282A35',
  background: '#131420',

  border: '#383A48',
  borderStrong: '#4E5162',

  overlay: 'rgba(0, 0, 0, 0.7)',

  place: '#C5D96B',
  selection: '#D7AEFB',

  water: '#1B2C3B',

  route: '#8AB4F8',
  routeCasing: '#1F3A63',
  transitRoute: '#D7AEFB',
  transitRouteCasing: '#4A2A6B',
  walkingRoute: '#81C995',
  walkingRouteCasing: '#17492C',
};

export const paletteFamilies = {
  maps: { light: mapsLight, dark: mapsDark },
  forest: { light: forestLight, dark: forestDark },
  harbour: { light: harbourLight, dark: harbourDark },
} as const;

export type PaletteName = keyof typeof paletteFamilies;

/**
 * The family the app wears. Changing this one word reskins every screen, the
 * basemap included — nothing outside this file names a family.
 *
 * It is not a user setting: light and dark are, and a second axis of choice on
 * top of those is a lot of surface for something an app usually just decides.
 */
export const ACTIVE_PALETTE: PaletteName = 'maps';

export const lightColors = paletteFamilies[ACTIVE_PALETTE].light;
export const darkColors = paletteFamilies[ACTIVE_PALETTE].dark;

export const palettes = { light: lightColors, dark: darkColors };
