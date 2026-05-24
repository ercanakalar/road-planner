import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  useGetRoadByIdQuery,
  useUpdateRoadByIdMutation,
  roadService,
  useUpdateWaypointByIdMutation,
} from 'store/services/roadService';
import {
  useAddFavoriteWaypointMutation,
  useRemoveFavoriteWaypointMutation,
} from 'store/services/favoriteService';

import TransportSelector from 'components/TransportSelector';
import WaypointCard from './WaypointCard';

import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';
import { useDirections } from 'hooks/useDirections';

const EnhancedWaypointList: React.FC<{ routeId: string }> = ({
  routeId,
}) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';

  const [selectedPair, setSelectedPair] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<TransportMode>('driving');

  const { data } = useGetRoadByIdQuery(
    { accessToken, roadId: routeId },
    { skip: !accessToken },
  ) as { data?: WaypointWithAddressAndId };

  const waypoints = useMemo(() => data?.wayPoints ?? [], [data?.wayPoints]);

  useEffect(() => {
    console.log(data);

  }, [routeId])

  const [deleteWaypoint] = useUpdateWaypointByIdMutation();
  const [updateRoadById] = useUpdateRoadByIdMutation();
  const [addFavoriteWaypoint] = useAddFavoriteWaypointMutation();
  const [removeFavoriteWaypoint] = useRemoveFavoriteWaypointMutation();

  const durations = useDirections(waypoints, selectedPair);

  const patchRoadCache = useCallback(
    (updater: (draft: WaypointWithAddress[]) => WaypointWithAddress[] | void) =>
      dispatch(
        roadService.util.updateQueryData(
          'getRoadById',
          { accessToken, routeId },
          (draft: unknown) => {
            const result = updater(
              (draft as { wayPoints: WaypointWithAddress[] }).wayPoints,
            );
            if (result)
              (draft as { wayPoints: WaypointWithAddress[] }).wayPoints =
                result;
          },
        ),
      ),
    [dispatch, accessToken, routeId],
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedPair((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return prev.length < 2 ? [...prev, id] : [prev[1], id];
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const patch = patchRoadCache((draft) => draft.filter((w) => w.id !== id));
      try {
        await deleteWaypoint({ accessToken, routeId, waypointId: id }).unwrap();
      } catch (error) {
        patch.undo();
        console.warn('Delete waypoint failed:', error);
      }
    },
    [accessToken, routeId, deleteWaypoint, patchRoadCache],
  );

  const toggleFavorite = useCallback(
    async (waypoint: WaypointWithAddress) => {
      const isFav = waypoint.favoriteWaypoints.length > 0;

      const patch = patchRoadCache((draft) => {
        const target = draft.find((w) => w.id === waypoint.id);
        if (!target) return;
        target.favoriteWaypoints = isFav
          ? []
          : [
            {
              id: 'temp-id',
              userId: '',
              wayPointsId: waypoint.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
      });

      try {
        if (isFav) {
          await removeFavoriteWaypoint({
            accessToken,
            favoriteId: waypoint.favoriteWaypoints[0].id,
          }).unwrap();
        } else {
          await addFavoriteWaypoint({
            accessToken,
            waypointId: waypoint.id,
          }).unwrap();
        }
      } catch (error) {
        patch.undo();
        console.warn('Favorite toggle failed:', error);
      }
    },
    [accessToken, addFavoriteWaypoint, removeFavoriteWaypoint, patchRoadCache],
  );

  const handleOptionSelect = useCallback(
    async (option: WaypointOption, item: WaypointWithAddress) => {
      if (option === 'delete') await handleDelete(item.id);
      else if (option === 'favorite') await toggleFavorite(item);
    },
    [handleDelete, toggleFavorite],
  );

  const updateOrder = useCallback(
    (newData: WaypointWithAddress[]) => {
      const reordered = newData.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      const patch = patchRoadCache(() => reordered);

      updateRoadById({
        accessToken,
        routeId,
        title: data?.title ?? '',
        description: data?.description ?? '',
        waypoints: reordered,
      })
        .unwrap()
        .catch((error) => {
          patch.undo();
          console.error('Failed to update order:', error);
        });
    },
    [
      accessToken,
      routeId,
      data?.title,
      data?.description,
      updateRoadById,
      patchRoadCache,
    ],
  );

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: RenderItemParams<WaypointWithAddress>): JSX.Element => (
      <WaypointCard
        item={item}
        drag={drag}
        isActive={isActive}
        selectedPair={selectedPair}
        toggleSelection={toggleSelection}
        handleOptionSelect={handleOptionSelect}
      />
    ),
    [selectedPair, toggleSelection, handleOptionSelect],
  );

  const keyExtractor = useCallback((item: WaypointWithAddress) => item.id, []);

  return (
    <DraggableFlatList
      data={waypoints}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onDragEnd={({ data }) => updateOrder(data)}
      ListHeaderComponent={
        <View style={styles.wrapper}>
          <View style={styles.privacyModeWrap}>
            <Text style={styles.privacyText}>Mode for selected pair:</Text>
            <TransportSelector
              selected={selectedMode}
              onChange={setSelectedMode}
              durations={durations}
            />
          </View>
        </View>
      }
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 16 },
  privacyModeWrap: { marginBottom: 16 },
  privacyText: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
});

export default EnhancedWaypointList;
