import { TransportMode } from 'types/transport-type';

/**
 * One stop as the link described it: either a point, or the words Google would
 * have looked up. Which of the two you get depends entirely on how the link was
 * made, so both have to be handled.
 */
export interface ParsedStop {
  latitude?: number;
  longitude?: number;
  /** The place as written in the link, when it carried no coordinate. */
  query?: string;
  /** Google's own id for the place, when the link carried one. */
  placeId?: string;
}

export interface ParsedGoogleMapsRoute {
  stops: ParsedStop[];
  mode?: TransportMode;
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co'];

/**
 * Links shared from the Google Maps app are shortened, and carry nothing but an
 * id — the route only appears once the redirect is followed.
 */
export const isShortGoogleMapsLink = (input: string): boolean => {
  const url = toUrl(input);
  return !!url && SHORT_LINK_HOSTS.includes(url.hostname.replace(/^www\./, ''));
};

export const isGoogleMapsLink = (input: string): boolean => {
  const url = toUrl(input);
  if (!url) return false;

  const host = url.hostname.replace(/^www\./, '');
  return (
    SHORT_LINK_HOSTS.includes(host) ||
    host === 'maps.google.com' ||
    /(^|\.)google(\.[a-z]{2,3}){1,2}$/.test(host)
  );
};

function toUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/** Google writes travelmode; this app has three modes and no cycling. */
const MODES: Record<string, TransportMode> = {
  driving: 'driving',
  walking: 'walking',
  transit: 'transit',
  // Cycling has no home here, and driving is the closer of the two remaining.
  bicycling: 'driving',
};

const COORDINATE = /^(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/;

const isLatitude = (value: number) => value >= -90 && value <= 90;
const isLongitude = (value: number) => value >= -180 && value <= 180;

/**
 * Turns one piece of a link into a stop. Anything that reads as a coordinate
 * pair becomes a point; everything else stays as words for the geocoder.
 */
export function parseStop(raw: string): ParsedStop | null {
  const text = decodeSegment(raw);
  if (!text) return null;

  const coordinate = COORDINATE.exec(text);

  if (coordinate) {
    const latitude = Number(coordinate[1]);
    const longitude = Number(coordinate[2]);

    if (isLatitude(latitude) && isLongitude(longitude)) {
      return { latitude, longitude };
    }
  }

  return { query: text };
}

function decodeSegment(raw: string): string {
  const withSpaces = raw.replace(/\+/g, ' ');

  try {
    return decodeURIComponent(withSpaces).trim();
  } catch {
    // A stray % that is not an escape should not lose the whole stop.
    return withSpaces.trim();
  }
}

/** Segments of a /maps/dir/ path that describe the view, not a stop. */
const isPathNoise = (segment: string) =>
  segment.startsWith('@') || /^[a-z0-9_]+=/i.test(segment);

function attachPlaceIds(stops: ParsedStop[], ids: (string | undefined)[]) {
  ids.forEach((placeId, index) => {
    if (placeId && stops[index]) stops[index].placeId = placeId;
  });
}

/** `?api=1&origin=…&destination=…&waypoints=A|B` — the documented URL scheme. */
function parseApiForm(url: URL): ParsedGoogleMapsRoute | null {
  const params = url.searchParams;
  const origin = params.get('origin');
  const destination = params.get('destination');

  if (!origin && !destination) return null;

  const between = (params.get('waypoints') ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const stops = [origin, ...between, destination]
    .filter((value): value is string => !!value)
    .map(parseStop)
    .filter((stop): stop is ParsedStop => stop !== null);

  attachPlaceIds(stops, [
    params.get('origin_place_id') ?? undefined,
    ...(params.get('waypoint_place_ids') ?? '')
      .split(',')
      .map((id) => id.trim() || undefined),
    params.get('destination_place_id') ?? undefined,
  ]);

  return { stops, mode: modeOf(params.get('travelmode')) };
}

/** `?saddr=A&daddr=B+to:C` — the shape older links and shares still use. */
function parseLegacyForm(url: URL): ParsedGoogleMapsRoute | null {
  const start = url.searchParams.get('saddr');
  const rest = url.searchParams.get('daddr');

  if (start === null && rest === null) return null;

  const destinations = (rest ?? '')
    .split(/\s+to:/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const stops = [start ?? '', ...destinations]
    .filter(Boolean)
    .map(parseStop)
    .filter((stop): stop is ParsedStop => stop !== null);

  return { stops, mode: modeOf(url.searchParams.get('dirflg')) };
}

/** `/maps/dir/A/B/C/@lat,lng,12z/data=…` — what the website puts in the bar. */
function parsePathForm(url: URL): ParsedGoogleMapsRoute | null {
  const segments = url.pathname.split('/').filter(Boolean);
  const start = segments.indexOf('dir');

  if (start === -1) return null;

  const stops = segments
    .slice(start + 1)
    .filter((segment) => !isPathNoise(segment))
    .map(parseStop)
    .filter((stop): stop is ParsedStop => stop !== null);

  return { stops, mode: modeOf(url.searchParams.get('travelmode')) };
}

/** A shared pin rather than a route: one stop, which is still worth importing. */
function parseSingleSearch(url: URL): ParsedGoogleMapsRoute | null {
  const query = url.searchParams.get('query') ?? url.searchParams.get('q');

  if (query) {
    const stop = parseStop(query);
    return stop ? { stops: [stop] } : null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const start = segments.indexOf('place');

  if (start === -1) return null;

  const stop = segments
    .slice(start + 1)
    .filter((segment) => !isPathNoise(segment))
    .map(parseStop)
    .find((candidate): candidate is ParsedStop => candidate !== null);

  return stop ? { stops: [stop] } : null;
}

function modeOf(value: string | null): TransportMode | undefined {
  if (!value) return undefined;

  // The legacy links spell the mode as a single letter.
  const legacy: Record<string, TransportMode> = {
    d: 'driving',
    w: 'walking',
    r: 'transit',
    b: 'driving',
  };

  return MODES[value.toLowerCase()] ?? legacy[value.toLowerCase()];
}

/**
 * Reads the stops out of a Google Maps link.
 *
 * Returns null when the link carries no route this app can use — including a
 * short link, which says nothing until its redirect has been followed.
 */
export function parseGoogleMapsRoute(
  input: string,
): ParsedGoogleMapsRoute | null {
  const url = toUrl(input);
  if (!url || !isGoogleMapsLink(input)) return null;

  const parsed =
    parseApiForm(url) ??
    parseLegacyForm(url) ??
    parsePathForm(url) ??
    parseSingleSearch(url);

  if (!parsed || parsed.stops.length === 0) return null;

  return parsed;
}
