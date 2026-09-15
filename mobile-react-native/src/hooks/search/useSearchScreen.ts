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

/** Long enough to stop typing, short enough not to feel like waiting. */
const TYPING_PAUSE_MS = 350;

/** Below this the API treats the term as absent, so asking is pointless. */
export const MIN_TERM_LENGTH = 2;

export type SearchTab = 'routes' | 'people';

const EMPTY_ROUTES: Page<RouteSearchHit> = {
  items: [],
  total: 0,
  hasMore: false,
};
const EMPTY_AUTHORS: Page<AuthorHit> = { items: [], total: 0, hasMore: false };

/** Who the route list is narrowed to, as little of them as a chip needs. */
export interface AuthorFilter {
  id: string;
  displayName: string;
}

/**
 * The search screen: one field over two lists, with the order and the filters
 * that apply to the route one.
 *
 * The term takes two steps to reach the network — deferred so typing never
 * waits on a re-render, then debounced so it never waits on a request either.
 * People are only searched while that tab is open; there is no reason to ask
 * for both on every keystroke.
 */
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

  // True while the results on screen are older than what has been typed.
  const isBehind = query.trim() !== term;

  const filters = useMemo(() => {
    const band = routeLengthFilters.find((option) => option.key === length);
    return { minStops: band?.minStops, maxStops: band?.maxStops };
  }, [length]);

  // The API treats a one-character term as no term and answers with the newest
  // routes instead. Sending it would look like search ignoring what was typed,
  // so the request is held back until the term means something.
  const isTermTooShort = term.length > 0 && term.length < MIN_TERM_LENGTH;

  // Every part of the question the route list is asking. Change any of them and
  // the reader is back at the top of a different list.
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
    // Nothing on the routes tab shows a person, so nothing there needs them.
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

  /**
   * Picking somebody in the People tab narrows the routes to theirs and shows
   * them, rather than leaving the screen: this is a filter the search bar owns,
   * so it stays where the rest of the filters are and comes off the same way.
   * Their profile is still one tap away, from the chevron on the row.
   */
  const filterByAuthor = useCallback((person: AuthorFilter) => {
    setAuthor({ id: person.id, displayName: person.displayName });
    setTab('routes');
  }, []);

  const clearAuthorFilter = useCallback(() => setAuthor(null), []);

  /**
   * The list asks for more only while it has not got everything and is not
   * already asking. `onEndReached` fires again on every few pixels of overscroll
   * and would otherwise queue a page per frame.
   */
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
    /** How many matched in total, which is what the filters are about. */
    total: shown.total,
    hasMore: shown.hasMore,
    loadMore,
    /** True only while a further page is on its way, not the first one. */
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
