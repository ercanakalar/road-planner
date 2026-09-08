import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  RoutePlace,
  RouteSearchRequest,
  RouteSearchResult,
  RouteSearchSort,
  searchPlacesAlongRoute,
} from 'services/mapsService';
import useDebouncedValue from 'hooks/common/useDebouncedValue';
import { DEFAULT_SEARCH_RADIUS_METERS } from 'constants/placeCategories';
import { StopWithAddress } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';

const DEBOUNCE_MS = 600;

const MIN_QUERY_LENGTH = 2;

const EMPTY_PLACES: RoutePlace[] = [];

const toCoordinate = ({ latitude, longitude }: StopWithAddress) => ({
  latitude,
  longitude,
});

interface RouteSearchInputs {
  query?: string;
  category?: string;
  radiusMeters: number;
  sortBy: RouteSearchSort;
  openNow: boolean;
  mode: TransportMode;
}

export function toRouteSearchRequest(
  stops: StopWithAddress[],
  { query, category, radiusMeters, sortBy, openNow, mode }: RouteSearchInputs,
): RouteSearchRequest | null {
  const term = query?.trim();
  const keyword = term && term.length >= MIN_QUERY_LENGTH ? term : undefined;

  if (stops.length < 2 || (!keyword && !category)) return null;

  return {
    origin: toCoordinate(stops[0]),
    destination: toCoordinate(stops[stops.length - 1]),
    waypoints: stops.slice(1, -1).map(toCoordinate),
    mode,
    radiusMeters,
    sortBy,
    ...(keyword ? { query: keyword } : {}),
    ...(category ? { category } : {}),
    ...(openNow ? { openNow } : {}),
  };
}

export interface RouteSearchState {
  query: string;
  setQuery: (query: string) => void;
  category?: string;
  toggleCategory: (category: string) => void;
  radiusMeters: number;
  setRadiusMeters: (meters: number) => void;
  sortBy: RouteSearchSort;
  setSortBy: (sortBy: RouteSearchSort) => void;
  openNow: boolean;
  toggleOpenNow: () => void;
  places: RoutePlace[];
  result?: RouteSearchResult;
  isSearching: boolean;
  hasSearched: boolean;
  isRoutable: boolean;
  error?: string;
  clear: () => void;
}

export function useRouteSearch(
  stops: StopWithAddress[],
  mode: TransportMode,
): RouteSearchState {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [radiusMeters, setRadiusMeters] = useState(
    DEFAULT_SEARCH_RADIUS_METERS,
  );
  const [sortBy, setSortBy] = useState<RouteSearchSort>('detour');
  const [openNow, setOpenNow] = useState(false);

  const [result, setResult] = useState<RouteSearchResult | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isRoutable = stops.length >= 2;

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  const signature = useMemo(
    () =>
      stops
        .map(
          (point) =>
            `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`,
        )
        .join('|'),
    [stops],
  );

  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const toggleCategory = useCallback((next: string) => {
    setCategory((current) => (current === next ? undefined : next));
  }, []);

  const toggleOpenNow = useCallback(() => setOpenNow((open) => !open), []);

  const clear = useCallback(() => {
    setQuery('');
    setCategory(undefined);
    setOpenNow(false);
    setResult(undefined);
    setHasSearched(false);
    setError(undefined);
  }, []);

  useEffect(() => {
    const request = toRouteSearchRequest(stopsRef.current, {
      query: debouncedQuery,
      category,
      radiusMeters,
      sortBy,
      openNow,
      mode,
    });

    if (!request) {
      setResult(undefined);
      setHasSearched(false);
      setError(undefined);
      return;
    }

    let cancelled = false;

    setIsSearching(true);
    setError(undefined);

    searchPlacesAlongRoute(request)
      .then((next) => {
        if (cancelled) return;
        setResult(next ?? undefined);
        setHasSearched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResult(undefined);
        setHasSearched(true);
        setError('Could not search along this route.');
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    category,
    debouncedQuery,
    mode,
    openNow,
    radiusMeters,
    signature,
    sortBy,
  ]);

  return {
    query,
    setQuery,
    category,
    toggleCategory,
    radiusMeters,
    setRadiusMeters,
    sortBy,
    setSortBy,
    openNow,
    toggleOpenNow,
    places: result?.places ?? EMPTY_PLACES,
    result,
    isSearching,
    hasSearched,
    isRoutable,
    error,
    clear,
  };
}

export default useRouteSearch;
