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
import i18n from 'i18n';

const EMPTY_DISCOVER: DiscoverRoute[] = [];

export const withFavoriteToggled = (routes: DiscoverRoute[], routeId: string) =>
  routes.map((route) =>
    route.id === routeId ? { ...route, isFavorite: !route.isFavorite } : route,
  );

export function useHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const { data: routes } = useGetOwnRoutesQuery(undefined, { skip: !isLoggedIn });

  const userId = useAppSelector((state) => state.auth.userId);
  const { data: profile } = useGetUserQuery(
    { userId: userId ?? '' },
    { skip: !userId },
  );

  const firstName =
    profile?.nickName?.trim() || profile?.firstName?.trim() || '';

  const travelAreas = useAppSelector((state) => state.travelMap.areas);

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
      stops: own.reduce((total, route) => total + (route._count.stops ?? 0), 0),
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

  const goToTravelMap = useCallback(
    () => navigation.navigate('TravelMapScreen'),
    [navigation],
  );

  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();

  const handleOpenCommunityRoute = useCallback(
    (routeId: string) => {
      const route = optimisticDiscoverRoutes.find((item) => item.id === routeId);
      navigation.navigate('CommunityRouteScreen', {
        routeId,
        title: route?.title ?? i18n.t('nav.communityRoute'),
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
    travelAreas,
    discoverRoutes: optimisticDiscoverRoutes,
    isDiscovering,
    refetchDiscover,
    savingRouteId,
    goToRoutes,
    goToSignIn,
    goToSearch,
    goToTravelMap,
    handleOpenCommunityRoute,
    handleToggleCommunityFavorite,
  };
}

export default useHomeScreen;
