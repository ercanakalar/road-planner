// Every feature the statistics table can count. An event that is not listed
// here is never written: the table only ever says which feature was used, by
// whom and when — never where, and never anything the person typed.

// Recorded by the server itself, through @TrackUsage on the endpoint.
export const SERVER_USAGE_EVENTS = [
  'account_signed_up',
  'account_signed_in',
  'route_created',
  'route_published',
  'route_copied',
  'route_deleted',
  'route_share_link_created',
  'route_share_link_opened',
  'route_terrain',
  'stop_added',
  'favorite_toggled',
  'author_follow_toggled',
  'search_routes',
  'search_people',
  'maps_directions',
  'maps_place_selected',
  'maps_along_route_search',
  'travel_map_lookup',
] as const;

// Features that run on the phone alone and leave the server nothing to see,
// reported by the app through POST /statistics/events.
export const CLIENT_USAGE_EVENTS = [
  'app_opened',
  'map_local_route_created',
  'map_google_import',
  'map_opened_in_google_maps',
  'travel_map_area_marked',
] as const;

export const USAGE_EVENTS = [
  ...SERVER_USAGE_EVENTS,
  ...CLIENT_USAGE_EVENTS,
] as const;

export type ServerUsageEvent = (typeof SERVER_USAGE_EVENTS)[number];
export type ClientUsageEvent = (typeof CLIENT_USAGE_EVENTS)[number];
export type UsageEventName = (typeof USAGE_EVENTS)[number];

// A detail is a short machine value — a travel mode, a place category, an
// area kind — so it cannot carry an address or a search term by accident.
export const USAGE_DETAIL_PATTERN = /^[a-z0-9_.-]{1,32}$/;

export const usageDetail = (value: unknown): string | null =>
  typeof value === 'string' && USAGE_DETAIL_PATTERN.test(value) ? value : null;

// How long a row is kept before the daily prune removes it. The KVKK notice
// promises this number; change both together.
export const USAGE_RETENTION_DAYS = 730;
