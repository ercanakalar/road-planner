import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  MapScreenProps,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

import Container from 'components/Container';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  roadService,
  useDeleteRoadByIdMutation,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import {
  useToggleFavoriteRoadMutation
} from 'store/services/favoriteService';
import RoutesTabBar from './RoutesTabBar';
import RoutesList from './roads/RouteList';
import Favorite from './favorites/Favorite';

const MapScreen = ({ navigation }: MapScreenProps) => {
  const dispatch = useAppDispatch();

  const { accessToken } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  const {
    data: roads,
    refetch,
    isFetching,
  } = useGetOwnRoadsQuery({ accessToken }, { skip: !accessToken }) as {
    data: WaypointWithAddressAndId[];
    refetch: () => void;
    isFetching: boolean;
  };

  const [deleteRoadById] = useDeleteRoadByIdMutation();
  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

  const favoriteRoads = useMemo(
    () => roads?.filter((road) => road.isFavorite) || [],
    [roads],
  );

  const displayedRoads = useMemo(
    () => (activeTab === 'favorites' ? favoriteRoads : roads),
    [activeTab, roads, favoriteRoads],
  );

  const handleDeleteRoad = async (roadId: string) => {
    if (!accessToken) return;

    const patchResult = dispatch(
      roadService.util.updateQueryData(
        'getOwnRoads',
        { accessToken },
        (draft: unknown) => {
          const typedDraft = draft as WaypointWithAddressAndId[];
          return typedDraft.filter(
            (r: WaypointWithAddressAndId) => r.id !== roadId,
          );
        },
      ),
    );

    try {
      await deleteRoadById({ accessToken, roadId }).unwrap();
    } catch (error) {
      patchResult.undo();
      console.error('Failed to delete road:', error);
    }
  };

  const handleToggleFavorite = async (road: WaypointWithAddressAndId) => {
    if (!accessToken) return;

    const patchResult = dispatch(
      roadService.util.updateQueryData(
        'getOwnRoads',
        { accessToken },
        (draft: unknown) => {
          const typedDraft = draft as WaypointWithAddressAndId[];
          const target = typedDraft.find((r) => r.id === road.id);
          if (!target) return;

          if (road.isFavorite) {
            target.isFavorite = false;
            target.favoriteRoads = [];
          } else {
            target.isFavorite = true;
            target.favoriteRoads = [
              {
                id: 'temp-id',
                userId: road.userId,
                roadId: road.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
          }
        },
      ),
    );

    try {
      await toggleFavoriteRoad({
        accessToken,
        roadId: road.id,
      }).unwrap();
    } catch (error) {
      patchResult.undo();
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleRefresh = useCallback(() => {
    if (!accessToken) return;
    refetch?.();
  }, [accessToken, refetch]);

  const handleView = useCallback(
    (roadId: string) => {
      navigation.navigate('ShowRouteByIdScreen', {
        roadId,
        accessToken: accessToken ?? '',
      });
    },
    [accessToken, navigation],
  );

  return (
    <Container>
      <View style={styles.container}>
        <RoutesTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          allCount={roads?.length ?? 0}
          favoritesCount={favoriteRoads.length}
        />
        {activeTab === 'all' ? (
          <RoutesList
            data={displayedRoads ?? []}
            accessToken={accessToken ?? ''}
            isRefreshing={!!isFetching}
            onRefresh={handleRefresh}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteRoad}
            onView={handleView}
          />
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
    gap: 12,
  },
});

export default MapScreen;
