export const TRANSPORT_MODES = [
  'driving',
  'walking',
  'bicycling',
  'transit',
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const DEFAULT_TRANSPORT_MODE: TransportMode = 'driving';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  mode?: TransportMode;
  optimize?: boolean;
}

/** One stop-to-stop hop of a route, as Google measures it. */
export interface RouteLeg {
  durationSeconds: number;
  distanceMeters: number;
}

export interface RouteResult {
  coordinates: LatLng[];
  durationSeconds: number;
  distanceMeters: number;
  mode: TransportMode;
  /**
   * The same journey broken at each stop. The totals above are these summed;
   * they are kept separately because a per-stop reading — how far and how
   * steeply the road climbs to reach this one — cannot be recovered from a
   * total.
   */
  legs: RouteLeg[];
}

export type ModeDurations = Partial<Record<TransportMode, number>>;

export interface AddressResult {
  address: string;
  country: string;
  province: string;
  district: string;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
}

/**
 * The box Google frames a place with, as its four edges. A street corner's is
 * metres across and a country's spans a continent, which is what makes it
 * usable as the shape of an area rather than only as a camera hint.
 *
 * `west` may be greater than `east` for the handful of places that straddle
 * the 180th meridian; callers that draw the box have to close it the long way
 * round rather than assume the two are ordered.
 */
export interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * How big a thing a place is, from Google's own types. It decides nothing on
 * the server — it is here so a client can tell a country from a cafe without
 * reading Google's type vocabulary itself.
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
 * A place with its extent: enough to drop a pin on, name, and shade in.
 */
export interface MapArea extends LatLng {
  placeId: string;
  /** Google's own short name — "İzmir", not "İzmir, Türkiye". */
  name: string;
  address: string;
  kind: AreaKind;
  bounds: AreaBounds;
}

export const PLACE_CATEGORIES = [
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'meal_takeaway',
  'gas_station',
  'lodging',
  'campground',
  'supermarket',
  'convenience_store',
  'pharmacy',
  'hospital',
  'atm',
  'bank',
  'parking',
  'car_repair',
  'tourist_attraction',
  'museum',
  'park',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export interface NearbyPlace extends LatLng {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  openNow?: boolean;
  types: string[];
}

export interface NearbySearchRequest {
  location: LatLng;
  radiusMeters: number;
  keyword?: string;
  category?: PlaceCategory;
  openNow?: boolean;
}

export const ROUTE_SEARCH_SORTS = ['detour', 'route', 'rating'] as const;

export type RouteSearchSort = (typeof ROUTE_SEARCH_SORTS)[number];

export interface RouteSearchRequest extends RouteRequest {
  keyword?: string;
  category?: PlaceCategory;
  radiusMeters: number;
  openNow?: boolean;
  minRating?: number;
  limit: number;
  sortBy: RouteSearchSort;
}

export interface RoutePlace extends NearbyPlace {
  distanceFromRouteMeters: number;
  distanceAlongRouteMeters: number;
  detourMeters: number;
  insertAfterIndex: number;
}

export interface RouteSearchResult {
  places: RoutePlace[];
  radiusMeters: number;
  routeDistanceMeters: number;
  routeDurationSeconds: number;
  mode: TransportMode;
  searchedPoints: number;
  coversWholeRoute: boolean;
}
