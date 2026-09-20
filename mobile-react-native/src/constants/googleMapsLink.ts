import { TransportMode } from 'types/transport-type';

interface LatLng {
  latitude: number;
  longitude: number;
}

export const GOOGLE_MAPS_STOP_LIMIT = 9;

const DIRECTIONS_URL = 'https://www.google.com/maps/dir/';

const travelModes: Record<TransportMode, string> = {
  walking: 'walking',
  driving: 'driving',
  transit: 'transit',
};

const coordinate = ({ latitude, longitude }: LatLng): string =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const thinToLimit = (stops: readonly LatLng[]): LatLng[] => {
  if (stops.length <= GOOGLE_MAPS_STOP_LIMIT) return [...stops];

  const step = (stops.length - 1) / (GOOGLE_MAPS_STOP_LIMIT - 1);

  return Array.from(
    { length: GOOGLE_MAPS_STOP_LIMIT },
    (_, index) => stops[Math.round(index * step)],
  );
};

export interface GoogleMapsRouteLink {
  url: string;
  includedCount: number;
  omittedCount: number;
}

export function buildGoogleMapsRouteUrl(
  waypoints: readonly LatLng[],
  mode: TransportMode = 'driving',
): GoogleMapsRouteLink | null {
  if (waypoints.length === 0) return null;

  const middle = thinToLimit(waypoints.slice(1, -1));

  const params = new URLSearchParams();
  params.append('api', '1');
  params.append('travelmode', travelModes[mode] ?? travelModes.driving);

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
