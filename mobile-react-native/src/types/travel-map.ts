/**
 * How big a thing a place is, as the server reads it off Google's own types.
 * The travel map colours an area by this, so a country and the city inside it
 * stay tellable apart where they overlap.
 */
export const AREA_KINDS = [
  'country',
  'region',
  'city',
  'district',
  'place',
] as const;

export type AreaKind = (typeof AREA_KINDS)[number];

/**
 * The four edges of the box a place covers.
 *
 * `west` can be greater than `east` for the places that straddle the 180th
 * meridian, so nothing here may assume the two are in order — see
 * {@link boundsToPolygon}, which closes the box the long way round.
 */
export interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** A place with its extent: enough to pin, name and shade in. */
export interface MapArea {
  placeId: string;
  /** The short name — "İzmir", where `address` is "İzmir, Türkiye". */
  name: string;
  address: string;
  kind: AreaKind;
  latitude: number;
  longitude: number;
  bounds: AreaBounds;
}

/** A place somebody has marked as visited, and when they marked it. */
export interface MarkedArea extends MapArea {
  /** ISO 8601, so the list can be ordered newest first across restarts. */
  markedAt: string;
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

/**
 * Whether something read back off the device is still a marked area.
 *
 * Anything stored by an older build, or half-written by a kill mid-save, is
 * dropped rather than drawn: a polygon with an undefined corner takes the map
 * down with it.
 */
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
    isBounds(area.bounds)
  );
};
