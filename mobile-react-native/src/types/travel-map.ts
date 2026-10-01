export const AREA_KINDS = [
  'country',
  'region',
  'city',
  'district',
  'place',
] as const;

export type AreaKind = (typeof AREA_KINDS)[number];

export interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapArea {
  placeId: string;
  name: string;
  address: string;
  kind: AreaKind;
  latitude: number;
  longitude: number;
  bounds: AreaBounds;
  // The city the area belongs to, as the server named it: null for one in no
  // city (a country), undefined for an area saved before areas carried it.
  city?: string | null;
  countryCode?: string | null;
}

export interface MarkedArea extends MapArea {
  markedAt: string;
  // Which of the city colours its city wears. Kept with the area so a city
  // keeps its colour when others come and go.
  colorSlot?: number;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isBounds = (value: unknown): value is AreaBounds => {
  const bounds = value as AreaBounds | undefined;

  return (
    !!bounds &&
    isNumber(bounds.north) &&
    isNumber(bounds.south) &&
    isNumber(bounds.east) &&
    isNumber(bounds.west)
  );
};

export const isAreaKind = (value: unknown): value is AreaKind =>
  AREA_KINDS.includes(value as AreaKind);

const isOptionalText = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'string';

export const isMarkedArea = (value: unknown): value is MarkedArea => {
  const area = value as MarkedArea | undefined;

  return (
    !!area &&
    typeof area.placeId === 'string' &&
    typeof area.name === 'string' &&
    typeof area.address === 'string' &&
    typeof area.markedAt === 'string' &&
    isAreaKind(area.kind) &&
    isNumber(area.latitude) &&
    isNumber(area.longitude) &&
    isBounds(area.bounds) &&
    isOptionalText(area.city) &&
    isOptionalText(area.countryCode) &&
    (area.colorSlot === undefined ||
      (Number.isInteger(area.colorSlot) && area.colorSlot >= 0))
  );
};
