import type { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from 'theme';
import { ColorScheme } from 'types/theme';
import { AreaKind, MarkedArea } from 'types/travel-map';
import { CITY_COLOR_COUNT, groupByCity } from 'utils/travelCities';
import { withAlpha } from 'utils/color';

type IconName = keyof typeof Ionicons.glyphMap;

export const AREA_FILL_OPACITY = 0.22;

// A country is drawn underneath its cities and is far bigger than any of them:
// a strong wash would drown out the colours that tell the cities apart.
export const COUNTRY_FILL_OPACITY = 0.06;

export const AREA_STROKE_OPACITY = 0.85;

export const AREA_STROKE_WIDTH = 2;

// The city colours. Chosen with the data-viz palette validator, all pairs, in
// both schemes, against the map's land colour: of the documented chart hues,
// the largest set in which any two stay distinguishable side by side, for
// full colour vision and for red-green colour blindness alike. Two of them
// fall below 3:1 on the light map and one pair sits in the colour-blind warn
// band on the dark map; both are acceptable only because every city is also
// named — by its label on the map and in the list beneath it.
export const CITY_COLORS: Record<ColorScheme, readonly string[]> = {
  light: ['#2a78d6', '#008300', '#e87ba4', '#eda100'],
  dark: ['#3987e5', '#008300', '#d55181', '#c98500'],
};

// An area in no city — a country — is drawn in a neutral ink, so colour only
// ever means "this city".
export const cityColor = (
  colors: ThemeColors,
  scheme: ColorScheme,
  slot: number | null | undefined,
): string =>
  slot === null || slot === undefined
    ? colors.textMuted
    : CITY_COLORS[scheme][slot % CITY_COLOR_COUNT];

export const areaFill = (color: string, kind: AreaKind): string =>
  withAlpha(
    color,
    kind === 'country' ? COUNTRY_FILL_OPACITY : AREA_FILL_OPACITY,
  );

export const areaStroke = (color: string): string =>
  withAlpha(color, AREA_STROKE_OPACITY);

export const AREA_KIND_ICON: Record<AreaKind, IconName> = {
  country: 'earth',
  region: 'map',
  city: 'business',
  district: 'home',
  place: 'location',
};

export const AREA_KIND_LABEL: Record<AreaKind, string> = {
  country: 'travelMap.kindCountry',
  region: 'travelMap.kindRegion',
  city: 'travelMap.kindCity',
  district: 'travelMap.kindDistrict',
  place: 'travelMap.kindPlace',
};

const KIND_WIDTH: Record<AreaKind, number> = {
  country: 0,
  region: 1,
  city: 2,
  district: 3,
  place: 4,
};

export const widestFirst = (areas: readonly MarkedArea[]): MarkedArea[] =>
  [...areas].sort((one, other) => KIND_WIDTH[one.kind] - KIND_WIDTH[other.kind]);

// "2 countries · 5 cities": the countries marked as such, and the cities the
// marked places fall in — a district of İstanbul counts İstanbul once.
export const summarisedCounts = (
  areas: readonly MarkedArea[],
): { key: string; count: number }[] => {
  const countries = areas.filter((area) => area.kind === 'country').length;
  const cities = groupByCity(areas).cities.length;

  return [
    ...(countries ? [{ key: 'travelMap.countries', count: countries }] : []),
    ...(cities ? [{ key: 'travelMap.cities', count: cities }] : []),
  ];
};
