import type { Region } from 'react-native-maps';

import { AreaBounds } from 'types/travel-map';

interface LatLng {
  latitude: number;
  longitude: number;
}

/** Degrees of longitude in one turn of the globe. */
const FULL_TURN = 360;

/** How far apart the points along a shaded edge may sit, in degrees. */
const EDGE_STEP_DEGREES = 5;

/** The most points one edge is worth, however wide the place is. */
const MAX_EDGE_STEPS = 24;

/** A box this small still frames as something you can see on screen. */
const MIN_DELTA = 0.01;

/**
 * The east edge rewritten so it always reads as further east than the west one.
 *
 * Google hands back Fiji as east −178.2, west 176.8, because the place wraps
 * past the 180th meridian. Taken at face value that box is the whole world
 * minus Fiji, so the wrapped edge is unwound instead and the extra turn is
 * taken off again when the middle is worked out.
 */
const unwrappedEast = ({ east, west }: AreaBounds): number =>
  east < west ? east + FULL_TURN : east;

/**
 * Back into the −180…180 a map region is written in.
 *
 * A longitude already in range is handed straight back rather than put through
 * the arithmetic, which would return 26.9 as 26.899999999999977.
 */
export const wrapLongitude = (longitude: number): number => {
  if (longitude >= -180 && longitude <= 180) return longitude;

  const wrapped = (((longitude + 180) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return wrapped - 180;
};

/**
 * One horizontal side of the box, as a run of points rather than a single
 * segment.
 *
 * A polygon with four corners is drawn edge-to-edge, and the two platforms do
 * not agree on what the shortest path between two corners is — across a
 * country-sized box MapKit bows the line towards the pole. Walking the edge in
 * steps keeps it flat on both, and a small place still costs two points.
 */
const edge = (latitude: number, from: number, to: number): LatLng[] => {
  const span = Math.abs(to - from);
  const steps = Math.min(
    MAX_EDGE_STEPS,
    Math.max(1, Math.ceil(span / EDGE_STEP_DEGREES)),
  );

  return Array.from({ length: steps + 1 }, (_value, step) => ({
    latitude,
    longitude: from + ((to - from) * step) / steps,
  }));
};

/**
 * The box as a polygon: along the top, back along the bottom. The ring closes
 * itself, which is what `Polygon` expects.
 */
export const boundsToPolygon = (bounds: AreaBounds): LatLng[] => {
  const east = unwrappedEast(bounds);

  return [
    ...edge(bounds.north, bounds.west, east),
    ...edge(bounds.south, east, bounds.west),
  ];
};

/**
 * The box's four corners, written in the −180…180 the map fits a camera to.
 *
 * Unlike {@link boundsToPolygon} these are wrapped rather than unwound: the
 * native bounds builder works out the smallest box holding the points it is
 * given, and it is the one that decides whether that box crosses the meridian.
 */
export const boundsCorners = (bounds: AreaBounds): LatLng[] => {
  const east = wrapLongitude(bounds.east);
  const west = wrapLongitude(bounds.west);

  return [
    { latitude: bounds.north, longitude: west },
    { latitude: bounds.north, longitude: east },
    { latitude: bounds.south, longitude: east },
    { latitude: bounds.south, longitude: west },
  ];
};

/**
 * Where to point the camera so the whole place is on screen, with a little air
 * around it.
 */
export const boundsToRegion = (bounds: AreaBounds, padding = 1.3): Region => {
  const east = unwrappedEast(bounds);

  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: wrapLongitude((bounds.west + east) / 2),
    latitudeDelta: Math.min(
      180,
      Math.max(MIN_DELTA, bounds.north - bounds.south) * padding,
    ),
    longitudeDelta: Math.min(
      FULL_TURN,
      Math.max(MIN_DELTA, east - bounds.west) * padding,
    ),
  };
};
