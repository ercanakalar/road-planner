import { AreaBounds, AreaKind, LatLng } from '../types/maps.types';

/**
 * The shapes Google returns geometry in. Every field is optional because the
 * geocoder, the places endpoint and the autocomplete details all fill in a
 * different subset of them.
 */
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
  /** The result's own extent. Only areas have one. */
  bounds?: GoogleBox;
  /** What Google would frame the result with. Everything has one. */
  viewport?: GoogleBox;
}

/**
 * Google's type vocabulary narrowed to the five sizes a client cares about,
 * widest first: a country is also `political`, and a district usually carries
 * half a dozen of these at once, so the first match is the honest one.
 *
 * `administrative_area_level_2` sits with the districts rather than the
 * cities, which is what it is in the countries this app is used in — İstanbul
 * is level 1 and Kadıköy is level 2 — and matches how the geocoder above
 * already splits a stop's address into a province and a district.
 */
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

/** Roughly 250 m across, for a place Google hands us no box for at all. */
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

/**
 * The extent to shade a place with.
 *
 * `bounds` is the result's own outline and `viewport` is what Google would
 * point a camera at, so the first is preferred where it exists — for a city
 * they are close, for a country the viewport can be noticeably tighter. A
 * result with neither is a point, and gets a box small enough to read as one.
 */
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

/** Whether Google gave this result a real outline, rather than a camera hint. */
export const hasOutline = (geometry?: GoogleGeometry): boolean =>
  toBounds(geometry?.bounds) !== null;
