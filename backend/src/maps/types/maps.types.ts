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

export interface PlaceDetails extends LatLng {
  address: string;
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
