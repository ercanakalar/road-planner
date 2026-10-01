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

export interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
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

// Countries whose first-level division is what people mean by "city". Turkey's
// 81 provinces are its cities — İstanbul and Ankara are both — so a district
// such as Kadıköy belongs to İstanbul, whatever Google calls its locality.
const PROVINCE_IS_CITY = new Set(['TR']);

const componentOf = (
  components: readonly GoogleAddressComponent[],
  type: string,
): GoogleAddressComponent | undefined =>
  components.find((component) => component.types?.includes(type));

const nameOf = (
  components: readonly GoogleAddressComponent[],
  ...types: string[]
): string =>
  types
    .map((type) => componentOf(components, type)?.long_name?.trim())
    .find(Boolean) ?? '';

export const areaCountryCode = (
  components: readonly GoogleAddressComponent[] = [],
): string | null =>
  componentOf(components, 'country')?.short_name?.trim().toUpperCase() || null;

// The city an area belongs to, so the travel map can colour each city in its
// own colour and give its districts and places the same one. Null for an area
// that is in no city: a country, or elsewhere a state, which both span many
// cities, and a place out in the country with no town around it.
export const areaCity = (
  kind: AreaKind,
  name: string,
  components: readonly GoogleAddressComponent[] = [],
): string | null => {
  if (kind === 'country') return null;

  const province = nameOf(components, 'administrative_area_level_1');
  const locality = nameOf(components, 'locality', 'postal_town');
  const country = areaCountryCode(components);

  if (country && PROVINCE_IS_CITY.has(country)) {
    return province || locality || name || null;
  }

  if (kind === 'region') return null;
  if (kind === 'city') return locality || name || null;

  return locality || null;
};
