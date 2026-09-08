import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import {
  DEFAULT_ROUTE_LENGTH,
  DEFAULT_ROUTE_SEARCH_ORDER,
  routeLengthFilters,
} from 'constants/routeSearch';
import useDebouncedValue from 'hooks/common/useDebouncedValue';
import { useAppSelector } from 'store/hook';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import {
  useSearchAuthorsQuery,
  useSearchRoutesQuery,
} from 'store/services/searchService';
import {
  AuthorHit,
  RouteSearchOrder,
  RouteSearchHit,
} from 'types/store/services/searchService-type';
import { RootStackParamList } from 'types/screens/screens';

/** Long enough to stop typing, short enough not to feel like waiting. */
const TYPING_PAUSE_MS = 350;

/** Below this the API treats the term as absent, so asking is pointless. */
export const MIN_TERM_LENGTH = 2;

export type SearchTab = 'routes' | 'people';

const EMPTY_ROUTES: RouteSearchHit[] = [];
const EMPTY_AUTHORS: AuthorHit[] = [];

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

  const {
    data: routes = EMPTY_ROUTES,
    isFetching: isSearchingRoutes,
    isError: routesFailed,
    refetch: refetchRoutes,
  } = useSearchRoutesQuery(
    { q: term, sort: order, ...filters },
    { skip: isTermTooShort },
  );

  const {
    data: authors = EMPTY_AUTHORS,
    isFetching: isSearchingAuthors,
    isError: authorsFailed,
    refetch: refetchAuthors,
  } = useSearchAuthorsQuery(
    { q: term },
    // Nothing on the routes tab shows a person, so nothing there needs them.
    { skip: tab !== 'people' || isTermTooShort },
  );

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

  const clear = useCallback(() => setQuery(''), []);

  const handleToggleFavorite = useCallback(
    (roadId: string) => {
      if (!isLoggedIn) {
        navigation.navigate('SignInScreen');
        return;
      }
      toggleFavoriteRoad({ roadId });
    },
    [isLoggedIn, navigation, toggleFavoriteRoad],
  );

  const openRoute = useCallback(
    (roadId: string) => {
      const hit = routes.find((route) => route.id === roadId);
      navigation.navigate('CommunityRouteScreen', {
        roadId,
        title: hit?.title ?? 'Route',
      });
    },
    [navigation, routes],
  );

  const openAuthor = useCallback(
    (author: { id: string; displayName: string }) =>
      navigation.navigate('AuthorScreen', {
        authorId: author.id,
        displayName: author.displayName,
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

  const isSearching = tab === 'routes' ? isSearchingRoutes : isSearchingAuthors;

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
    routes: isTermTooShort ? EMPTY_ROUTES : routes,
    authors: isTermTooShort ? EMPTY_AUTHORS : authors,
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
