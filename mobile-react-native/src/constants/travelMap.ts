import type { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from 'theme';
import { AreaKind, MarkedArea } from 'types/travel-map';
import { withAlpha } from 'utils/color';

type IconName = keyof typeof Ionicons.glyphMap;

export const AREA_FILL_OPACITY = 0.22;

export const AREA_STROKE_OPACITY = 0.85;

export const AREA_STROKE_WIDTH = 2;

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

const KIND_WIDTH: Record<AreaKind, number> = {
  country: 0,
  region: 1,
  city: 2,
  district: 3,
  place: 4,
};

export const widestFirst = (areas: readonly MarkedArea[]): MarkedArea[] =>
  [...areas].sort((one, other) => KIND_WIDTH[one.kind] - KIND_WIDTH[other.kind]);

const SUMMARISED: readonly (readonly [AreaKind, string])[] = [
  ['country', 'travelMap.countries'],
  ['city', 'travelMap.cities'],
];

export const summarisedCounts = (
  areas: readonly MarkedArea[],
): { key: string; count: number }[] =>
  SUMMARISED.flatMap(([kind, key]) => {
    const count = areas.filter((area) => area.kind === kind).length;
    return count ? [{ key, count }] : [];
  });
