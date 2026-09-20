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
import i18n from 'i18n';

const EXPAND_TIMEOUT_MS = 8000;

export const IMPORT_STOPS_MAX = 25;

export interface ResolvedStop {
  latitude: number;
  longitude: number;
  address: string;
  label: string;
}

export interface ImportedRoute extends ParsedGoogleMapsRoute {
  stops: ParsedStop[];
  resolved: ResolvedStop[];
  unresolved: string[];
}

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
    : i18n.t('mapUi.unnamedStop'));

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
