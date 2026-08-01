import appConfig from 'constants/appConfig';
import { decodePolyline } from 'utils/decodePolyline';
import { createAsyncCache } from 'utils/asyncCache';
import { RouteCoordinate } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';
import { WaypointAddressInput } from 'types/store/services/roadService-type';

const MAPS_ROOT = 'https://maps.googleapis.com/maps/api';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  coordinates: RouteCoordinate[];
  durationSeconds: number;
  distanceMeters: number;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
}

export class GoogleMapsError extends Error {}

const coordKey = ({ latitude, longitude }: LatLng) =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const isAbort = (error: unknown) =>
  (error as Error | undefined)?.name === 'AbortError';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new GoogleMapsError(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Directions                                                                  */
/* -------------------------------------------------------------------------- */

interface DirectionsLeg {
  duration?: { value: number };
  distance?: { value: number };
}

interface DirectionsResponse {
  status: string;
  routes?: {
    legs?: DirectionsLeg[];
    overview_polyline?: { points?: string };
  }[];
}

const directionsCache = createAsyncCache<DirectionsResult | null>(60);

export interface DirectionsRequest {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  mode?: TransportMode;
  optimize?: boolean;
}

const directionsKey = ({
  origin,
  destination,
  waypoints = [],
  mode = 'driving',
  optimize = false,
}: DirectionsRequest) =>
  [
    mode,
    optimize ? 'opt' : 'fixed',
    coordKey(origin),
    coordKey(destination),
    waypoints.map(coordKey).join('|'),
  ].join('#');

export async function fetchDirections(
  request: DirectionsRequest,
): Promise<DirectionsResult | null> {
  const key = directionsKey(request);

  return directionsCache.resolve(key, async () => {
    const {
      origin,
      destination,
      waypoints = [],
      mode = 'driving',
      optimize = false,
    } = request;

    const params = new URLSearchParams({
      origin: coordKey(origin),
      destination: coordKey(destination),
      mode,
      key: appConfig.mapApiKey,
    });

    if (waypoints.length) {
      const prefix = optimize ? 'optimize:true|' : '';
      params.set('waypoints', prefix + waypoints.map(coordKey).join('|'));
    }

    const json = await getJson<DirectionsResponse>(
      `${MAPS_ROOT}/directions/json?${params.toString()}`,
    );

    const route = json.status === 'OK' ? json.routes?.[0] : undefined;
    if (!route) return null;

    const legs = route.legs ?? [];
    return {
      coordinates: route.overview_polyline?.points
        ? decodePolyline(route.overview_polyline.points)
        : [],
      durationSeconds: legs.reduce(
        (total, leg) => total + (leg.duration?.value ?? 0),
        0,
      ),
      distanceMeters: legs.reduce(
        (total, leg) => total + (leg.distance?.value ?? 0),
        0,
      ),
    };
  });
}

export const peekDirections = (request: DirectionsRequest) =>
  directionsCache.peek(directionsKey(request));

interface GeocodeComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResponse {
  status: string;
  results?: {
    formatted_address?: string;
    address_components?: GeocodeComponent[];
  }[];
}

const geocodeCache = createAsyncCache<WaypointAddressInput>(80);

const pickComponent = (
  components: GeocodeComponent[],
  types: string[],
): string | undefined =>
  components.find((component) =>
    types.some((type) => component.types.includes(type)),
  )?.long_name;

const FALLBACK_ADDRESS: WaypointAddressInput = {
  address: 'Dropped pin',
  country: '',
  province: '',
  district: '',
};

export async function reverseGeocode(
  coordinate: LatLng,
): Promise<WaypointAddressInput> {
  const key = coordKey(coordinate);

  return geocodeCache.resolve(key, async () => {
    const params = new URLSearchParams({
      latlng: key,
      key: appConfig.mapApiKey,
    });

    const json = await getJson<GeocodeResponse>(
      `${MAPS_ROOT}/geocode/json?${params.toString()}`,
    );

    const result = json.status === 'OK' ? json.results?.[0] : undefined;
    if (!result) return FALLBACK_ADDRESS;

    const components = result.address_components ?? [];
    return {
      address: result.formatted_address ?? FALLBACK_ADDRESS.address,
      country: pickComponent(components, ['country']) ?? '',
      province:
        pickComponent(components, [
          'administrative_area_level_1',
          'locality',
        ]) ?? '',
      district:
        pickComponent(components, [
          'administrative_area_level_2',
          'sublocality',
          'sublocality_level_1',
        ]) ?? '',
    };
  });
}

interface AutocompleteResponse {
  status: string;
  predictions?: { place_id: string; description: string }[];
}

interface PlaceDetailsResponse {
  status: string;
  result?: {
    geometry?: { location?: { lat: number; lng: number } };
    formatted_address?: string;
    name?: string;
  };
}

export const createSessionToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function fetchPlacePredictions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    input,
    sessiontoken: sessionToken,
    key: appConfig.mapApiKey,
  });

  try {
    const json = await getJson<AutocompleteResponse>(
      `${MAPS_ROOT}/place/autocomplete/json?${params.toString()}`,
      signal,
    );
    if (json.status !== 'OK') return [];
    return (json.predictions ?? []).map((prediction) => ({
      placeId: prediction.place_id,
      description: prediction.description,
    }));
  } catch (error) {
    if (isAbort(error)) return [];
    throw error;
  }
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<(LatLng & { address: string }) | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    sessiontoken: sessionToken,
    fields: 'geometry/location,formatted_address,name',
    key: appConfig.mapApiKey,
  });

  try {
    const json = await getJson<PlaceDetailsResponse>(
      `${MAPS_ROOT}/place/details/json?${params.toString()}`,
      signal,
    );

    const location = json.result?.geometry?.location;
    if (json.status !== 'OK' || !location) return null;

    return {
      latitude: location.lat,
      longitude: location.lng,
      address:
        json.result?.formatted_address ?? json.result?.name ?? 'Selected place',
    };
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}
