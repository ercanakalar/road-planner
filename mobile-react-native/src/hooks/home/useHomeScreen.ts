import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { DISCOVER_REFRESH_MS } from 'constants/pagination';
import { useAppSelector } from 'store/hook';
import { useToggleFavoriteRouteMutation } from 'store/services/favoriteService';
import {
  useGetDiscoverRoutesQuery,
  useGetOwnRoutesQuery,
} from 'store/services/routeService';
import { useGetUserQuery } from 'store/services/profileService';
import { DiscoverRoute } from 'types/store/services/routeService-type';
import { RootStackParamList } from 'types/screens/screens';

const EMPTY_DISCOVER: DiscoverRoute[] = [];

/**
 * Flips one route's heart. The list is replaced rather than mutated so the
 * optimistic copy never aliases the cached one.
 */
export const withFavoriteToggled = (routes: DiscoverRoute[], routeId: string) =>
  routes.map((route) =>
    route.id === routeId ? { ...route, isFavorite: !route.isFavorite } : route,
  );

/**
 * The home screen's data: a count of what you have saved, and the rotating
 * sample of published routes.
 *
 * Hearting a community route round-trips to the server and then refetches the
 * whole sample, which is far too long to leave a tapped heart unlit. The heart is
 * flipped optimistically for the length of that action instead, and falls back
 * to whatever the refetch says — including on failure, where the flip simply
 * disappears when the action ends.
 */
export function useHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const { data: routes } = useGetOwnRoutesQuery(undefined, { skip: !isLoggedIn });

  // Asked for here rather than read off the user slice, which only fills in
  // once the Profile tab has been opened — this is the first screen after
  // signing in, and it would greet you by name only if you had been to
  // Profile first. RTK Query serves the two from one request.
  const userId = useAppSelector((state) => state.auth.userId);
  const { data: profile } = useGetUserQuery(
    { userId: userId ?? '' },
    { skip: !userId },
  );

  // The greeting wants something short enough to sit next to "Hello,", so a
  // nickname beats a first name, and either beats a full one.
  const firstName =
    profile?.nickName?.trim() || profile?.firstName?.trim() || '';

  const {
    data: discoverRoutes,
    isFetching: isDiscovering,
    refetch: refetchDiscover,
  } = useGetDiscoverRoutesQuery(undefined, {
    pollingInterval: DISCOVER_REFRESH_MS,
    refetchOnMountOrArgChange: true,
  });

  const [optimisticDiscoverRoutes, toggleOptimisticFavorite] = useOptimistic(
    discoverRoutes ?? EMPTY_DISCOVER,
    withFavoriteToggled,
  );

  const [, startFavoriteAction] = useTransition();
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const own = routes ?? [];
    return {
      routes: own.length,
      stops: own.reduce((total, route) => total + (route.stopCount ?? 0), 0),
      favorites: own.filter((route) => route.isFavorite).length,
    };
  }, [routes]);

  const goToRoutes = useCallback(
    () => navigation.navigate('HomeTabNavigator', { screen: 'Routes' }),
    [navigation],
  );

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  const goToSearch = useCallback(
    () => navigation.navigate('SearchScreen'),
    [navigation],
  );

  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();

  const handleOpenCommunityRoute = useCallback(
    (routeId: string) => {
      const route = optimisticDiscoverRoutes.find((item) => item.id === routeId);
      navigation.navigate('CommunityRouteScreen', {
        routeId,
        title: route?.title ?? 'Community route',
      });
    },
    [navigation, optimisticDiscoverRoutes],
  );

  const handleToggleCommunityFavorite = useCallback(
    (routeId: string) => {
      if (!isLoggedIn) {
        goToSignIn();
        return;
      }

      setSavingRouteId(routeId);
      startFavoriteAction(async () => {
        toggleOptimisticFavorite(routeId);
        try {
          await toggleFavoriteRoute({ routeId }).unwrap();
          await refetchDiscover();
        } catch {
          // The mutation surfaces its own error, and ending the action drops
          // the optimistic heart back to the server's answer.
        } finally {
          setSavingRouteId(null);
        }
      });
    },
    [
      goToSignIn,
      isLoggedIn,
      refetchDiscover,
      toggleFavoriteRoute,
      toggleOptimisticFavorite,
    ],
  );

  return {
    isLoggedIn,
    firstName,
    stats,
    discoverRoutes: optimisticDiscoverRoutes,
    isDiscovering,
    refetchDiscover,
    savingRouteId,
    goToRoutes,
    goToSignIn,
    goToSearch,
    handleOpenCommunityRoute,
    handleToggleCommunityFavorite,
  };
}

export default useHomeScreen;
