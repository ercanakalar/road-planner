import { Ionicons } from '@expo/vector-icons';

import { RouteSearchOrder } from 'types/store/services/searchService-type';

/** The orders search offers, in the order they are offered. */
export const routeSearchOrders: {
  key: RouteSearchOrder;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'recent', label: 'Newest', icon: 'time-outline' },
  { key: 'popular', label: 'Most saved', icon: 'heart-outline' },
  { key: 'stops', label: 'Most stops', icon: 'location-outline' },
  { key: 'title', label: 'A–Z', icon: 'text-outline' },
  { key: 'oldest', label: 'Oldest', icon: 'hourglass-outline' },
];

export const DEFAULT_ROUTE_SEARCH_ORDER: RouteSearchOrder = 'recent';

/**
 * Length filters, as bands rather than a number picker: nobody wants a route
 * with "at least seven stops", they want a short one or a long one.
 */
export const routeLengthFilters: {
  key: string;
  label: string;
  minStops?: number;
  maxStops?: number;
}[] = [
  { key: 'any', label: 'Any length' },
  { key: 'short', label: '2–4 stops', minStops: 2, maxStops: 4 },
  { key: 'medium', label: '5–9 stops', minStops: 5, maxStops: 9 },
  { key: 'long', label: '10+ stops', minStops: 10 },
];

export const DEFAULT_ROUTE_LENGTH = 'any';
