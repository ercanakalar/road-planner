export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;

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

  route: string;
  routeCasing: string;
  transitRoute: string;
  transitRouteCasing: string;
  walkingRoute: string;
  walkingRouteCasing: string;
}

// Google Maps palette — Google Blue primary, red destination pins, Google's
// grey neutrals. Values are Google's own Material/Maps steps, picked at the
// step that clears the contrast each token needs rather than the brightest.
//
// Four constraints keep the app readable, so check them before editing:
//   - Waypoint pins color by position (MapSection): start uses `success`,
//     the destination uses `accent`, stops in between use `primary`, and a
//     place found along the route uses `place`. All four are on screen at
//     once, so they stay far apart in hue — green ~145°, red ~1°, blue
//     ~215°, olive ~77°; the closest pair is 63°. `warning` is deliberately
//     not among them: it sits 33° from `accent` and reads as a second
//     destination pin.
//   - `selection` marks the two waypoints being compared, on the map and in
//     the list alike. It temporarily replaces whichever of the four a pin
//     would otherwise use, so it is a fifth hue kept clear of them all —
//     violet ~282°, 67° from its nearest neighbour.
//   - The three route modes are drawn over the same map — driving ~215°,
//     transit ~272°, walking ~145° — and each casing is a lighter halo of
//     its own hue holding >= 3:1 against the line it outlines.
//   - `primary` is used for small label text (links, secondary buttons), so
//     it holds >= 4.5:1 against `surface`, `background`, `surfaceAlt` and
//     `primarySoft`. This is why it is Blue 700 and not the Blue 600
//     (#1A73E8) Google uses for buttons: 600 falls to 3.93:1 on
//     `primarySoft`, which secondary buttons are filled with.
//   - `text` and `textMuted` clear 4.5:1 on all three backgrounds. In dark
//     that pushes `textMuted` a step lighter than Google's #9AA0A6, which
//     reaches only 3.96:1 on `surfaceAlt`.

export const lightColors: ThemeColors = {
  primary: '#1967D2',
  primaryDark: '#174EA6',
  primarySoft: '#E8F0FE',

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

  route: '#1967D2',
  routeCasing: '#AECBFA',
  transitRoute: '#9334E6',
  transitRouteCasing: '#E9D2FD',
  walkingRoute: '#137333',
  walkingRouteCasing: '#A8DAB5',
};

export const darkColors: ThemeColors = {
  primary: '#8AB4F8',
  primaryDark: '#669DF6',
  primarySoft: '#1A3050',

  accent: '#F28B82',
  accentSoft: '#3C1F1C',

  success: '#81C995',
  successSoft: '#12301D',

  danger: '#F28B82',
  dangerSoft: '#3C1F1C',

  warning: '#FDD663',

  text: '#E8EAED',
  textMuted: '#ADB3B9',
  textSubtle: '#80868B',
  textInverse: '#202124',

  surface: '#303134',
  surfaceAlt: '#3C4043',
  background: '#202124',

  border: '#4A4D51',
  borderStrong: '#5F6368',

  overlay: 'rgba(0, 0, 0, 0.7)',

  place: '#C5D96B',
  selection: '#D7AEFB',

  route: '#8AB4F8',
  routeCasing: '#1F3A63',
  transitRoute: '#D7AEFB',
  transitRouteCasing: '#4A2A6B',
  walkingRoute: '#81C995',
  walkingRouteCasing: '#17492C',
};

export const palettes = { light: lightColors, dark: darkColors };
