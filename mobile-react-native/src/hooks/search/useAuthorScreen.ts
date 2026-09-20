import { useCallback, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import {
  DEFAULT_ROUTE_LENGTH,
  DEFAULT_ROUTE_SEARCH_ORDER,
  routeLengthFilters,
} from 'constants/routeSearch';
import usePagedOffset from 'hooks/common/usePagedOffset';
import { useAppSelector } from 'store/hook';
import { useToggleFavoriteRouteMutation } from 'store/services/favoriteService';
import {
  useFollowAuthorMutation,
  useGetAuthorQuery,
  useSearchRoutesQuery,
} from 'store/services/searchService';
import {
  RouteSearchHit,
  RouteSearchOrder,
} from 'types/store/services/searchService-type';
import { Page } from 'types/store/bases';
import { RootStackParamList } from 'types/screens/screens';

const EMPTY_ROUTES: Page<RouteSearchHit> = {
  items: [],
  total: 0,
  hasMore: false,
};

export function useAuthorScreen(authorId: string) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const [order, setOrder] = useState<RouteSearchOrder>(
    DEFAULT_ROUTE_SEARCH_ORDER,
  );
  const [length, setLength] = useState(DEFAULT_ROUTE_LENGTH);

  const filters = useMemo(() => {
    const band = routeLengthFilters.find((option) => option.key === length);
    return { minStops: band?.minStops, maxStops: band?.maxStops };
  }, [length]);

  const [offset, loadNextPage, resetPage] = usePagedOffset(
    `${authorId}|${order}|${length}`,
    SEARCH_PAGE_SIZE,
  );

  const { data: author, isLoading: isLoadingAuthor } = useGetAuthorQuery({
    authorId,
  });

  const {
    data: page = EMPTY_ROUTES,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSearchRoutesQuery({
    q: '',
    sort: order,
    authorId,
    offset,
    ...filters,
  });

  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();
  const [followAuthor, { isLoading: isUpdatingFollow }] =
    useFollowAuthorMutation();

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

  const handleToggleFollow = useCallback(() => {
    if (!isLoggedIn) {
      navigation.navigate('SignInScreen');
      return;
    }
    followAuthor({ authorId, follow: !author?.isFollowed });
  }, [author?.isFollowed, authorId, followAuthor, isLoggedIn, navigation]);

  const openRoute = useCallback(
    (routeId: string) => {
      const hit = page.items.find((route) => route.id === routeId);
      navigation.navigate('CommunityRouteScreen', {
        routeId,
        title: hit?.title ?? 'Route',
      });
    },
    [navigation, page],
  );

  const loadMore = useCallback(() => {
    if (page.hasMore && !isFetching) loadNextPage();
  }, [isFetching, loadNextPage, page.hasMore]);

  const refresh = useCallback(() => {
    if (offset > 0) {
      resetPage();
      return;
    }
    refetch();
  }, [offset, refetch, resetPage]);

  return {
    author,
    isLoadingAuthor,
    routes: page.items,
    total: page.total,
    hasMore: page.hasMore,
    loadMore,
    isLoadingMore: isFetching && page.items.length > 0,
    order,
    setOrder,
    length,
    setLength,
    isLoading,
    isFetching,
    isError,
    refetch,
    refresh,
    isLoggedIn,
    isFollowed: !!author?.isFollowed,
    isUpdatingFollow,
    handleToggleFollow,
    handleToggleFavorite,
    openRoute,
  };
}

export default useAuthorScreen;
