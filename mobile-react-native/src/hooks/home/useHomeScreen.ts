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
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import {
  useGetDiscoverRoadsQuery,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import { DiscoverRoad } from 'types/store/services/roadService-type';
import { RootStackParamList } from 'types/screens/screens';

const EMPTY_DISCOVER: DiscoverRoad[] = [];

/**
 * Flips one road's star. The list is replaced rather than mutated so the
 * optimistic copy never aliases the cached one.
 */
export const withFavoriteToggled = (roads: DiscoverRoad[], roadId: string) =>
  roads.map((road) =>
    road.id === roadId ? { ...road, isFavorite: !road.isFavorite } : road,
  );

/**
 * The home screen's data: a count of what you have saved, and the rotating
 * sample of published routes.
 *
 * Starring a community route round-trips to the server and then refetches the
 * whole sample, which is far too long to leave a tapped star unlit. The star is
 * flipped optimistically for the length of that action instead, and falls back
 * to whatever the refetch says — including on failure, where the flip simply
 * disappears when the action ends.
 */
export function useHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const { data: roads } = useGetOwnRoadsQuery(undefined, { skip: !isLoggedIn });

  const {
    data: discoverRoads,
    isFetching: isDiscovering,
    refetch: refetchDiscover,
  } = useGetDiscoverRoadsQuery(undefined, {
    pollingInterval: DISCOVER_REFRESH_MS,
    refetchOnMountOrArgChange: true,
  });

  const [optimisticDiscoverRoads, toggleOptimisticFavorite] = useOptimistic(
    discoverRoads ?? EMPTY_DISCOVER,
    withFavoriteToggled,
  );

  const [, startFavoriteAction] = useTransition();
  const [savingRoadId, setSavingRoadId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const own = roads ?? [];
    return {
      routes: own.length,
      stops: own.reduce((total, road) => total + (road.stopCount ?? 0), 0),
      favorites: own.filter((road) => road.isFavorite).length,
    };
  }, [roads]);

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

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

  const handleOpenCommunityRoad = useCallback(
    (roadId: string) => {
      const road = optimisticDiscoverRoads.find((item) => item.id === roadId);
      navigation.navigate('CommunityRouteScreen', {
        roadId,
        title: road?.title ?? 'Community route',
      });
    },
    [navigation, optimisticDiscoverRoads],
  );

  const handleToggleCommunityFavorite = useCallback(
    (roadId: string) => {
      if (!isLoggedIn) {
        goToSignIn();
        return;
      }

      setSavingRoadId(roadId);
      startFavoriteAction(async () => {
        toggleOptimisticFavorite(roadId);
        try {
          await toggleFavoriteRoad({ roadId }).unwrap();
          await refetchDiscover();
        } catch {
          // The mutation surfaces its own error, and ending the action drops
          // the optimistic star back to the server's answer.
        } finally {
          setSavingRoadId(null);
        }
      });
    },
    [
      goToSignIn,
      isLoggedIn,
      refetchDiscover,
      toggleFavoriteRoad,
      toggleOptimisticFavorite,
    ],
  );

  return {
    isLoggedIn,
    stats,
    discoverRoads: optimisticDiscoverRoads,
    isDiscovering,
    refetchDiscover,
    savingRoadId,
    goToRoutes,
    goToSignIn,
    goToSearch,
    handleOpenCommunityRoad,
    handleToggleCommunityFavorite,
  };
}

export default useHomeScreen;
