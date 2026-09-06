import { TransportMode } from 'types/transport-type';

interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Google Maps carries at most nine stops between the origin and the
 * destination. Anything past that is dropped on Google's side without a word,
 * so longer routes are thinned here instead and the caller is told how many
 * stops were left behind.
 */
export const GOOGLE_MAPS_WAYPOINT_LIMIT = 9;

/**
 * The Maps URLs scheme. It needs no key and costs nothing — handing the route
 * over to Google this way spends none of the Directions quota the app pays for
 * while the route is being built.
 */
const DIRECTIONS_URL = 'https://www.google.com/maps/dir/';

/** Our modes happen to be spelled the way Maps URLs spells them. */
const travelModes: Record<TransportMode, string> = {
  walking: 'walking',
  driving: 'driving',
  transit: 'transit',
};

/** Six decimals is ~10cm — far finer than a dropped pin needs. */
const coordinate = ({ latitude, longitude }: LatLng): string =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/** Keeps both ends and spreads the rest evenly, so the shape survives. */
const thinToLimit = (stops: readonly LatLng[]): LatLng[] => {
  if (stops.length <= GOOGLE_MAPS_WAYPOINT_LIMIT) return [...stops];

  const step = (stops.length - 1) / (GOOGLE_MAPS_WAYPOINT_LIMIT - 1);

  return Array.from(
    { length: GOOGLE_MAPS_WAYPOINT_LIMIT },
    (_, index) => stops[Math.round(index * step)],
  );
};

export interface GoogleMapsRouteLink {
  url: string;
  /** Stops the link carries, both ends included. */
  includedCount: number;
  /** Stops dropped to fit Google's ceiling. */
  omittedCount: number;
}

/**
 * Turns a route into a Google Maps directions link. The stops arrive in the
 * order they are travelled: the first is the origin, the last the destination,
 * everything between them a waypoint.
 */
export function buildGoogleMapsRouteUrl(
  waypoints: readonly LatLng[],
  mode: TransportMode = 'driving',
): GoogleMapsRouteLink | null {
  if (waypoints.length === 0) return null;

  const middle = thinToLimit(waypoints.slice(1, -1));

  const params = new URLSearchParams();
  params.append('api', '1');
  params.append('travelmode', travelModes[mode] ?? travelModes.driving);

  // A lone stop is a destination, and with no origin Google routes to it from
  // wherever the phone is.
  if (waypoints.length > 1) params.append('origin', coordinate(waypoints[0]));

  params.append('destination', coordinate(waypoints[waypoints.length - 1]));

  if (middle.length > 0) {
    params.append('waypoints', middle.map(coordinate).join('|'));
  }

  const includedCount = middle.length + Math.min(waypoints.length, 2);

  return {
    url: `${DIRECTIONS_URL}?${params.toString()}`,
    includedCount,
    omittedCount: waypoints.length - includedCount,
  };
}

export default buildGoogleMapsRouteUrl;
