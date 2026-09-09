import { API_BASE_URL } from 'constants/apiUrl';
import tokenStorage from 'services/tokenStorage';
import { createAsyncCache } from 'utils/asyncCache';
import { RouteCoordinate, StopShape } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';

const REQUEST_TIMEOUT_MS = 12000;

interface LatLng {
    latitude: number;
    longitude: number;
}

export interface DirectionsResult {
    coordinates: RouteCoordinate[];
    durationSeconds: number;
    distanceMeters: number;
}

export interface DirectionsRequest {
    origin: LatLng;
    destination: LatLng;
    waypoints?: LatLng[];
    mode?: TransportMode;
    optimize?: boolean;
}

export interface PlacePrediction {
    placeId: string;
    description: string;
}

export type RouteSearchSort = 'detour' | 'route' | 'rating';

export interface RouteSearchRequest extends DirectionsRequest {
    query?: string;
    category?: string;
    radiusMeters?: number;
    openNow?: boolean;
    minRating?: number;
    limit?: number;
    sortBy?: RouteSearchSort;
}

export interface RoutePlace extends LatLng {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    ratingCount?: number;
    priceLevel?: number;
    openNow?: boolean;
    types: string[];
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

type ModeDurations = Partial<Record<TransportMode, number>>;

class MapsApiError extends Error {}

const isAbort = (error: unknown) =>
    (error as Error | undefined)?.name === 'AbortError';

const coordKey = ({ latitude, longitude }: LatLng) =>
    `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

interface RequestOptions {
    method?: 'GET' | 'POST';
    body?: unknown;
    params?: Record<string, string | undefined>;
    signal?: AbortSignal;
}

const buildUrl = (path: string, params: RequestOptions['params']): string => {
    const query = new URLSearchParams();

    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== '') query.append(key, value);
    });

    const search = query.toString();
    return `${API_BASE_URL}${path}${search ? `?${search}` : ''}`;
};

const authHeader = async (): Promise<Record<string, string>> => {
    const token = await tokenStorage.getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request<T>(
    path: string,
    { method = 'GET', body, params, signal }: RequestOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const onCallerAbort = () => controller.abort();
    signal?.addEventListener('abort', onCallerAbort);

    try {
        const response = await fetch(buildUrl(path, params), {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(await authHeader()),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new MapsApiError(
                `Request failed with status ${response.status}`,
            );
        }

        const envelope = (await response.json()) as { data?: T };
        return envelope?.data as T;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onCallerAbort);
    }
}

const directionsCache = createAsyncCache<DirectionsResult | null>(60);

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
    request_: DirectionsRequest,
): Promise<DirectionsResult | null> {
    return directionsCache.resolve(directionsKey(request_), () =>
        request<DirectionsResult | null>('/maps/directions', {
            method: 'POST',
            body: request_,
        }),
    );
}

export const peekDirections = (request_: DirectionsRequest) =>
    directionsCache.peek(directionsKey(request_));

/**
 * The road's shape at each of a route's stops, measured along the polyline
 * Google routes rather than the straight lines between the pins.
 *
 * Saved routes read this from `/road/:id/terrain`; this is the same reading
 * for a route still being drawn on the map, which has no id yet. Cached on the
 * points themselves, since the answer only changes when one of them moves.
 */
const terrainCache = createAsyncCache<(StopShape | null)[]>(40);

const terrainKey = (stops: LatLng[], mode: TransportMode) =>
    `${mode}:${stops
        .map(({ latitude, longitude }) =>
            `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        )
        .join('|')}`;

export async function fetchTerrain(
    stops: LatLng[],
    mode: TransportMode,
): Promise<(StopShape | null)[]> {
    return terrainCache.resolve(terrainKey(stops, mode), async () =>
        (await request<(StopShape | null)[]>('/road/terrain', {
            method: 'POST',
            body: { stops, mode },
        })) ?? [],
    );
}

export const peekTerrain = (stops: LatLng[], mode: TransportMode) =>
    terrainCache.peek(terrainKey(stops, mode));

const durationsCache = createAsyncCache<ModeDurations>(40);

export async function fetchModeDurations(
    request_: Omit<DirectionsRequest, 'mode' | 'optimize'>,
    modes: TransportMode[],
): Promise<ModeDurations> {
    const key = [
        modes.join(','),
        coordKey(request_.origin),
        coordKey(request_.destination),
        (request_.waypoints ?? []).map(coordKey).join('|'),
    ].join('#');

    return durationsCache.resolve(key, () =>
        request<ModeDurations>('/maps/durations', {
            method: 'POST',
            body: { ...request_, modes },
        }),
    );
}

/**
 * What `/maps/geocode/reverse` answers. The stop itself stores only the
 * formatted `address`; the components are still returned for callers that want
 * to name a place before one is saved.
 */
export interface ReverseGeocodeResult {
    address: string;
    country: string;
    province: string;
    district: string;
}

const geocodeCache = createAsyncCache<ReverseGeocodeResult>(80);

export async function reverseGeocode(
    coordinate: LatLng,
): Promise<ReverseGeocodeResult> {
    return geocodeCache.resolve(coordKey(coordinate), () =>
        request<ReverseGeocodeResult>('/maps/geocode/reverse', {
            params: {
                latitude: String(coordinate.latitude),
                longitude: String(coordinate.longitude),
            },
        }),
    );
}

export const createSessionToken = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function fetchPlacePredictions(
    input: string,
    sessionToken: string,
    signal?: AbortSignal,
): Promise<PlacePrediction[]> {
    try {
        return (
            (await request<PlacePrediction[]>('/maps/places/search', {
                params: { input, sessionToken },
                signal,
            })) ?? []
        );
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
    try {
        return await request<(LatLng & { address: string }) | null>(
            `/maps/places/${encodeURIComponent(placeId)}`,
            { params: { sessionToken }, signal },
        );
    } catch (error) {
        if (isAbort(error)) return null;
        throw error;
    }
}

const routeSearchCache = createAsyncCache<RouteSearchResult | null>(20);

const routeSearchKey = ({
    origin,
    destination,
    waypoints = [],
    mode = 'driving',
    query,
    category,
    radiusMeters,
    openNow,
    minRating,
    limit,
    sortBy,
}: RouteSearchRequest) =>
    [
        mode,
        coordKey(origin),
        coordKey(destination),
        waypoints.map(coordKey).join('|'),
        query?.trim().toLowerCase() ?? '',
        category ?? '',
        radiusMeters ?? '',
        openNow ? 'open' : 'any',
        minRating ?? '',
        limit ?? '',
        sortBy ?? '',
    ].join('#');

export async function searchPlacesAlongRoute(
    request_: RouteSearchRequest,
): Promise<RouteSearchResult | null> {
    return routeSearchCache.resolve(routeSearchKey(request_), () =>
        request<RouteSearchResult | null>('/maps/places/along-route', {
            method: 'POST',
            body: request_,
        }),
    );
}
