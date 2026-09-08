import { useCallback, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import {
  DEFAULT_ROUTE_SEARCH_ORDER,
} from 'constants/routeSearch';
import { useAppSelector } from 'store/hook';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import {
  useGetAuthorQuery,
  useSearchRoutesQuery,
} from 'store/services/searchService';
import {
  RouteSearchHit,
  RouteSearchOrder,
} from 'types/store/services/searchService-type';
import { RootStackParamList } from 'types/screens/screens';

const EMPTY_ROUTES: RouteSearchHit[] = [];

/**
 * One author's public shelf.
 *
 * The routes come from the same search endpoint the search screen uses, narrowed
 * to this person — there is nothing different about "their routes" beyond the
 * filter, so it would only be a second way to ask the same question.
 */
export function useAuthorScreen(authorId: string) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const [order, setOrder] = useState<RouteSearchOrder>(
    DEFAULT_ROUTE_SEARCH_ORDER,
  );

  const { data: author, isLoading: isLoadingAuthor } = useGetAuthorQuery({
    authorId,
  });

  const {
    data: routes = EMPTY_ROUTES,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSearchRoutesQuery({ q: '', sort: order, authorId });

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

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

  return {
    author,
    isLoadingAuthor,
    routes,
    order,
    setOrder,
    isLoading,
    isFetching,
    isError,
    refetch,
    isLoggedIn,
    handleToggleFavorite,
    openRoute,
  };
}

export default useAuthorScreen;
