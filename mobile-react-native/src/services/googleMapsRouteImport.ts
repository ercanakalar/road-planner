import {
  createSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
  reverseGeocode,
} from 'services/mapsService';
import {
  isShortGoogleMapsLink,
  ParsedStop,
  parseGoogleMapsRoute,
  ParsedGoogleMapsRoute,
} from 'utils/googleMapsRoute';

/** Long enough for a redirect, short enough that a dead link gives up. */
const EXPAND_TIMEOUT_MS = 8000;

/**
 * More stops than any shared link carries, and past the point where resolving
 * them all is polite to either API.
 */
export const IMPORT_STOPS_MAX = 25;

export interface ResolvedStop {
  latitude: number;
  longitude: number;
  address: string;
  /** What the link called this stop, which the preview shows. */
  label: string;
}

export interface ImportedRoute extends ParsedGoogleMapsRoute {
  stops: ParsedStop[];
  resolved: ResolvedStop[];
  /** Stops named in the link that no lookup could place. */
  unresolved: string[];
}

/**
 * Follows a maps.app.goo.gl link to the real one.
 *
 * A shortened link carries an id and nothing else, so there is no route to read
 * until Google has been asked where it points.
 */
export async function expandShortLink(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPAND_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return response.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

const describe = (stop: ParsedStop): string =>
  stop.query ??
  (stop.latitude !== undefined && stop.longitude !== undefined
    ? `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`
    : 'Unnamed stop');

/**
 * Turns one stop from a link into a point on the map.
 *
 * A link gives any of three things — a coordinate, a place id, or the words a
 * person typed — and only the first is already usable. The other two have to go
 * back through Google to become one.
 */
async function resolveStop(
  stop: ParsedStop,
  sessionToken: string,
): Promise<ResolvedStop | null> {
  const label = describe(stop);

  if (stop.latitude !== undefined && stop.longitude !== undefined) {
    const address = await reverseGeocode({
      latitude: stop.latitude,
      longitude: stop.longitude,
    })
      .then((result) => result.address)
      // A point is usable without a name for it, so a failed lookup costs the
      // label, not the stop.
      .catch(() => '');

    return {
      latitude: stop.latitude,
      longitude: stop.longitude,
      address,
      label: address || label,
    };
  }

  const placeId =
    stop.placeId ??
    (stop.query
      ? (await fetchPlacePredictions(stop.query, sessionToken))[0]?.placeId
      : undefined);

  if (!placeId) return null;

  const details = await fetchPlaceDetails(placeId, sessionToken).catch(
    () => null,
  );

  if (!details) return null;

  return {
    latitude: details.latitude,
    longitude: details.longitude,
    address: details.address,
    label: details.address || label,
  };
}

/**
 * Reads a Google Maps link and places every stop it names.
 *
 * Returns null when the link holds no route at all. A link whose stops are only
 * partly resolvable still comes back — with the ones that failed listed, so the
 * import can say what it could not find rather than quietly dropping it.
 */
export async function importGoogleMapsRoute(
  input: string,
): Promise<ImportedRoute | null> {
  const link = isShortGoogleMapsLink(input)
    ? await expandShortLink(input.trim())
    : input;

  const parsed = parseGoogleMapsRoute(link);
  if (!parsed) return null;

  const stops = parsed.stops.slice(0, IMPORT_STOPS_MAX);
  const sessionToken = createSessionToken();

  const settled = await Promise.all(
    stops.map((stop) =>
      resolveStop(stop, sessionToken).catch(() => null),
    ),
  );

  const resolved: ResolvedStop[] = [];
  const unresolved: string[] = [];

  settled.forEach((result, index) => {
    if (result) resolved.push(result);
    else unresolved.push(describe(stops[index]));
  });

  return { ...parsed, stops, resolved, unresolved };
}
