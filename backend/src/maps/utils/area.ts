import { AreaBounds, AreaKind, LatLng } from '../types/maps.types';

interface GoogleLatLng {
  lat?: number;
  lng?: number;
}

interface GoogleBox {
  northeast?: GoogleLatLng;
  southwest?: GoogleLatLng;
}

export interface GoogleGeometry {
  location?: GoogleLatLng;
  bounds?: GoogleBox;
  viewport?: GoogleBox;
}

const KINDS: readonly (readonly [AreaKind, readonly string[]])[] = [
  ['country', ['country']],
  ['region', ['administrative_area_level_1']],
  ['city', ['locality', 'postal_town']],
  [
    'district',
    [
      'administrative_area_level_2',
      'administrative_area_level_3',
      'administrative_area_level_4',
      'sublocality',
      'sublocality_level_1',
      'neighborhood',
    ],
  ],
];

const PIN_BOX_DEGREES = 0.0025;

export const areaKind = (types: readonly string[] = []): AreaKind =>
  KINDS.find(([, googleTypes]) =>
    googleTypes.some((type) => types.includes(type)),
  )?.[0] ?? 'place';

const toBounds = (box?: GoogleBox): AreaBounds | null => {
  const north = box?.northeast?.lat;
  const east = box?.northeast?.lng;
  const south = box?.southwest?.lat;
  const west = box?.southwest?.lng;

  if (
    north === undefined ||
    east === undefined ||
    south === undefined ||
    west === undefined
  ) {
    return null;
  }

  return { north, south, east, west };
};

export const areaBounds = (
  geometry: GoogleGeometry | undefined,
  location: LatLng,
): AreaBounds =>
  toBounds(geometry?.bounds) ??
  toBounds(geometry?.viewport) ?? {
    north: location.latitude + PIN_BOX_DEGREES,
    south: location.latitude - PIN_BOX_DEGREES,
    east: location.longitude + PIN_BOX_DEGREES,
    west: location.longitude - PIN_BOX_DEGREES,
  };

export const hasOutline = (geometry?: GoogleGeometry): boolean =>
  toBounds(geometry?.bounds) !== null;
