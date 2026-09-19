import type { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from 'theme';
import { AreaKind, MarkedArea } from 'types/travel-map';
import { withAlpha } from 'utils/color';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Faint enough that the roads, coastline and place names underneath still read
 * through it — the point of the travel map is the map, coloured in, not a
 * sheet of colour with a map somewhere behind it. Two places that overlap
 * deepen where they meet, which is the honest picture of a city inside the
 * country it belongs to.
 */
export const AREA_FILL_OPACITY = 0.22;

/** The outline, which carries the shape where the fill is nearly invisible. */
export const AREA_STROKE_OPACITY = 0.85;

export const AREA_STROKE_WIDTH = 2;

/**
 * One hue per size of place, spread far enough apart that a country and the
 * district inside it stay tellable apart at a fifth of their strength.
 */
const KIND_COLOR: Record<AreaKind, keyof ThemeColors> = {
  country: 'primary',
  region: 'selection',
  city: 'accent',
  district: 'warning',
  place: 'success',
};

export const AREA_KIND_ICON: Record<AreaKind, IconName> = {
  country: 'earth',
  region: 'map',
  city: 'business',
  district: 'home',
  place: 'location',
};

/** Keys rather than words: which language they are said in is not decided here. */
export const AREA_KIND_LABEL: Record<AreaKind, string> = {
  country: 'travelMap.kindCountry',
  region: 'travelMap.kindRegion',
  city: 'travelMap.kindCity',
  district: 'travelMap.kindDistrict',
  place: 'travelMap.kindPlace',
};

export const areaColor = (colors: ThemeColors, kind: AreaKind): string =>
  colors[KIND_COLOR[kind]];

export const areaFill = (colors: ThemeColors, kind: AreaKind): string =>
  withAlpha(areaColor(colors, kind), AREA_FILL_OPACITY);

export const areaStroke = (colors: ThemeColors, kind: AreaKind): string =>
  withAlpha(areaColor(colors, kind), AREA_STROKE_OPACITY);

/**
 * Widest first. Drawn in this order a country goes down before the city inside
 * it, so the smaller place is never buried under the larger one.
 */
const KIND_WIDTH: Record<AreaKind, number> = {
  country: 0,
  region: 1,
  city: 2,
  district: 3,
  place: 4,
};

export const widestFirst = (areas: readonly MarkedArea[]): MarkedArea[] =>
  [...areas].sort((one, other) => KIND_WIDTH[one.kind] - KIND_WIDTH[other.kind]);

/**
 * The sizes of place worth calling out on their own, widest first, with the
 * key each is counted under.
 */
const SUMMARISED: readonly (readonly [AreaKind, string])[] = [
  ['country', 'travelMap.countries'],
  ['city', 'travelMap.cities'],
];

/**
 * How much of the map has been coloured in, as counts to be put into words.
 *
 * Countries and cities are what anybody means by that; a district or a single
 * cafe is counted in the total shown beside this and not called out here, so a
 * map holding only those summarises as nothing and the caller says something
 * else instead. The ones nobody has marked are left out rather than reported
 * as none.
 */
export const summarisedCounts = (
  areas: readonly MarkedArea[],
): { key: string; count: number }[] =>
  SUMMARISED.flatMap(([kind, key]) => {
    const count = areas.filter((area) => area.kind === kind).length;
    return count ? [{ key, count }] : [];
  });
