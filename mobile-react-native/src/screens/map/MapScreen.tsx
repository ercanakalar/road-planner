import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import Container from 'components/Container';
import ScreenState from 'components/ScreenState';
import RoutesTabBar, { RoutesTab } from './RoutesTabBar';
import RoutesList from './roads/RouteList';
import Favorite from './favorites/Favorite';

import { useAppSelector } from 'store/hook';
import {
  useDeleteRoadByIdMutation,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';

import { colors, spacing } from 'theme';
import { MapScreenProps, WaypointWithAddressAndId } from 'types/map-screen-type';

const EMPTY_ROADS: WaypointWithAddressAndId[] = [];

const MapScreen = ({ navigation }: MapScreenProps) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const [activeTab, setActiveTab] = useState<RoutesTab>('all');

  const {
    data: roads = EMPTY_ROADS,
    refetch,
    isFetching,
    isLoading,
    isError,
  } = useGetOwnRoadsQuery(undefined, { skip: !isLoggedIn });

  const [deleteRoadById] = useDeleteRoadByIdMutation();
  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

  const favoritesCount = useMemo(
    () => roads.filter((road) => road.isFavorite).length,
    [roads],
  );

  /*
   * All three handlers are memoized. They are passed down to `memo(RouteCard)`
   * through the list, so a fresh identity on each render would re-render every
   * card in the list for free.
   */
  const handleDeleteRoad = useCallback(
    (road: WaypointWithAddressAndId) => {
      Alert.alert(
        'Delete route',
        `“${road.title}” and its stops will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteRoadById({ roadId: road.id }),
          },
        ],
      );
    },
    [deleteRoadById],
  );

  const handleToggleFavorite = useCallback(
    (road: WaypointWithAddressAndId) => {
      toggleFavoriteRoad({ roadId: road.id });
    },
    [toggleFavoriteRoad],
  );

  const handleRefresh = useCallback(() => {
    if (isLoggedIn) refetch();
  }, [isLoggedIn, refetch]);

  const handleView = useCallback(
    (roadId: string) => navigation.navigate('ShowRouteByIdScreen', { roadId }),
    [navigation],
  );

  if (!isLoggedIn) {
    return (
      <Container>
        <ScreenState
          variant='empty'
          icon='lock-closed-outline'
          title='Sign in to see your routes'
          message='Your saved routes and favourites live with your account.'
        />
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <RoutesTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          allCount={roads.length}
          favoritesCount={favoritesCount}
        />

        {activeTab === 'all' ? (
          isLoading ? (
            <ScreenState variant='loading' title='Loading your routes…' />
          ) : isError ? (
            <ScreenState
              variant='error'
              title='Could not load routes'
              message='Check your connection and try again.'
              actionLabel='Retry'
              onAction={handleRefresh}
            />
          ) : (
            <RoutesList
              data={roads}
              isRefreshing={isFetching}
              onRefresh={handleRefresh}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteRoad}
              onView={handleView}
            />
          )
        ) : (
          <Favorite />
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});

export default MapScreen;
