import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import {
  DEFAULT_ROUTE_LENGTH,
  DEFAULT_ROUTE_SEARCH_ORDER,
  routeLengthFilters,
} from 'constants/routeSearch';
import useDebouncedValue from 'hooks/common/useDebouncedValue';
import usePagedOffset from 'hooks/common/usePagedOffset';
import { useAppSelector } from 'store/hook';
import { useToggleFavoriteRouteMutation } from 'store/services/favoriteService';
import {
  useSearchAuthorsQuery,
  useSearchRoutesQuery,
} from 'store/services/searchService';
import {
  AuthorHit,
  RouteSearchOrder,
  RouteSearchHit,
} from 'types/store/services/searchService-type';
import { Page } from 'types/store/bases';
import { RootStackParamList } from 'types/screens/screens';

const TYPING_PAUSE_MS = 350;

export const MIN_TERM_LENGTH = 2;

export type SearchTab = 'routes' | 'people';

const EMPTY_ROUTES: Page<RouteSearchHit> = {
  items: [],
  total: 0,
  hasMore: false,
};
const EMPTY_AUTHORS: Page<AuthorHit> = { items: [], total: 0, hasMore: false };

export interface AuthorFilter {
  id: string;
  displayName: string;
}

export function useSearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('routes');
  const [order, setOrder] = useState<RouteSearchOrder>(
    DEFAULT_ROUTE_SEARCH_ORDER,
  );
  const [length, setLength] = useState(DEFAULT_ROUTE_LENGTH);
  const [author, setAuthor] = useState<AuthorFilter | null>(null);

  const deferredQuery = useDeferredValue(query);
  const term = useDebouncedValue(deferredQuery.trim(), TYPING_PAUSE_MS);

  const isBehind = query.trim() !== term;

  const filters = useMemo(() => {
    const band = routeLengthFilters.find((option) => option.key === length);
    return { minStops: band?.minStops, maxStops: band?.maxStops };
  }, [length]);

  const isTermTooShort = term.length > 0 && term.length < MIN_TERM_LENGTH;

  const [routeOffset, loadMoreRoutes] = usePagedOffset(
    `${term}|${order}|${length}|${author?.id ?? ''}`,
    SEARCH_PAGE_SIZE,
  );
  const [authorOffset, loadMoreAuthors] = usePagedOffset(
    term,
    SEARCH_PAGE_SIZE,
  );

  const {
    data: routePage = EMPTY_ROUTES,
    isFetching: isSearchingRoutes,
    isError: routesFailed,
    refetch: refetchRoutes,
  } = useSearchRoutesQuery(
    {
      q: term,
      sort: order,
      ...filters,
      authorId: author?.id,
      offset: routeOffset,
    },
    { skip: isTermTooShort },
  );

  const {
    data: authorPage = EMPTY_AUTHORS,
    isFetching: isSearchingAuthors,
    isError: authorsFailed,
    refetch: refetchAuthors,
  } = useSearchAuthorsQuery(
    { q: term, offset: authorOffset },
    { skip: tab !== 'people' || isTermTooShort },
  );

  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();

  const clear = useCallback(() => setQuery(''), []);

  const handleToggleFavorite = useCallback(
    (routeId: string) => {
      if (!isLoggedIn) {
        navigation.navigate('SignInScreen');
        return;
      }
      toggleFavoriteRoute({ routeId });
    },
    [isLoggedIn, navigation, toggleFavoriteRoute],
  );

  const routes = isTermTooShort ? EMPTY_ROUTES : routePage;
  const authors = isTermTooShort ? EMPTY_AUTHORS : authorPage;

  const openRoute = useCallback(
    (routeId: string) => {
      const hit = routes.items.find((route) => route.id === routeId);
      navigation.navigate('CommunityRouteScreen', {
        routeId,
        title: hit?.title ?? 'Route',
      });
    },
    [navigation, routes],
  );

  const openAuthor = useCallback(
    (person: { id: string; displayName: string }) =>
      navigation.navigate('AuthorScreen', {
        authorId: person.id,
        displayName: person.displayName,
      }),
    [navigation],
  );

  const openAuthorOfRoute = useCallback(
    (route: { authorId?: string; author: string }) => {
      if (!route.authorId) return;
      openAuthor({ id: route.authorId, displayName: route.author });
    },
    [openAuthor],
  );

  const filterByAuthor = useCallback((person: AuthorFilter) => {
    setAuthor({ id: person.id, displayName: person.displayName });
    setTab('routes');
  }, []);

  const clearAuthorFilter = useCallback(() => setAuthor(null), []);

  const loadMore = useCallback(() => {
    if (tab === 'routes') {
      if (routes.hasMore && !isSearchingRoutes) loadMoreRoutes();
      return;
    }
    if (authors.hasMore && !isSearchingAuthors) loadMoreAuthors();
  }, [
    authors.hasMore,
    isSearchingAuthors,
    isSearchingRoutes,
    loadMoreAuthors,
    loadMoreRoutes,
    routes.hasMore,
    tab,
  ]);

  const isSearching = tab === 'routes' ? isSearchingRoutes : isSearchingAuthors;
  const shown = tab === 'routes' ? routes : authors;

  return {
    query,
    setQuery,
    clear,
    term,
    isBehind,
    isTermTooShort,
    tab,
    setTab,
    order,
    setOrder,
    length,
    setLength,
    author,
    filterByAuthor,
    clearAuthorFilter,
    routes: routes.items,
    authors: authors.items,
    total: shown.total,
    hasMore: shown.hasMore,
    loadMore,
    isLoadingMore: isSearching && shown.items.length > 0,
    isSearching,
    isFailed: tab === 'routes' ? routesFailed : authorsFailed,
    retry: tab === 'routes' ? refetchRoutes : refetchAuthors,
    isLoggedIn,
    handleToggleFavorite,
    openRoute,
    openAuthor,
    openAuthorOfRoute,
  };
}

export default useSearchScreen;
