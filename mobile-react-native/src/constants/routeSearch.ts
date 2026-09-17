import { Ionicons } from '@expo/vector-icons';

import { RouteSearchOrder } from 'types/store/services/searchService-type';

/** The orders search offers, in the order they are offered. */
export const routeSearchOrders: {
  key: RouteSearchOrder;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'recent', label: 'sorting.newest', icon: 'time-outline' },
  { key: 'popular', label: 'sorting.mostSaved', icon: 'heart-outline' },
  { key: 'stops', label: 'sorting.mostStops', icon: 'location-outline' },
  { key: 'title', label: 'sorting.alphabetical', icon: 'text-outline' },
  { key: 'oldest', label: 'sorting.oldest', icon: 'hourglass-outline' },
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
  { key: 'any', label: 'sorting.anyLength' },
  { key: 'short', label: 'sorting.shortRoutes', minStops: 2, maxStops: 4 },
  { key: 'medium', label: 'sorting.mediumRoutes', minStops: 5, maxStops: 9 },
  { key: 'long', label: 'sorting.longRoutes', minStops: 10 },
];

export const DEFAULT_ROUTE_LENGTH = 'any';
