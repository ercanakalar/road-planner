import React, { JSX, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import DraggableFlatList, { DragEndParams, RenderItemParams } from 'react-native-draggable-flatlist';

import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  useGetRoadByIdQuery,
  roadService,
  useDeleteWaypointByIdMutation,
  useReOrderWaypointsMutation,
} from 'store/services/roadService';
import {
  useToggleFavoriteWaypointMutation,
} from 'store/services/favoriteService';

import TransportSelector from 'components/TransportSelector';
import WaypointCard from './WaypointCard';
import { useDirections } from 'hooks/useDirections';

import { WaypointWithAddress, WaypointWithAddressAndId } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

const EnhancedWaypointList: React.FC<{ roadId: string }> = ({ roadId }) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';

  const [selectedPair, setSelectedPair] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<TransportMode>('driving');


  const { data, refetch } = useGetRoadByIdQuery(
    { accessToken, roadId },
    { skip: !accessToken },
  ) as { data?: WaypointWithAddressAndId; refetch: () => void };

  const waypoints = useMemo(() => data?.wayPoints ?? [], [data?.wayPoints]);


  const [deleteWaypointById] = useDeleteWaypointByIdMutation();
  const [reOrderWaypoints] = useReOrderWaypointsMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();

  const durations = useDirections(waypoints, selectedPair);


  const patchRoadCache = useCallback(
    (updater: (draft: WaypointWithAddressAndId) => void) =>
      dispatch(
        roadService.util.updateQueryData(
          'getRoadById',
          { accessToken, roadId },
          (draft: unknown) => {
            updater(draft as WaypointWithAddressAndId);
          },
        ),
      ),
    [dispatch, accessToken, roadId],
  );


  const toggleSelection = useCallback((id: string) => {
    setSelectedPair((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return prev.length < 2 ? [...prev, id] : [prev[1], id];
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {

      const patch = patchRoadCache((draft) => {
        draft.wayPoints = draft.wayPoints.filter((wp) => wp.id !== id);
      });

      try {
        await deleteWaypointById({ accessToken, roadId, waypointId: id }).unwrap();

        refetch();
      } catch (error) {
        patch.undo();
        console.warn('Delete waypoint failed:', error);
      }
    },
    [accessToken, roadId, deleteWaypointById, patchRoadCache, refetch],
  );

  const toggleFavorite = useCallback(
    async (waypoint: WaypointWithAddress) => {
      const isFav = waypoint.favoriteWaypoints.length > 0;
      const patch = patchRoadCache((draft) => {
        const target = draft.wayPoints.find((w) => w.id === waypoint.id);
        if (!target) return;
        target.favoriteWaypoints = isFav
          ? []
          : [{
            id: 'temp-id',
            userId: '',
            wayPointsId: waypoint.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }];
      });

      try {

        await toggleFavoriteWaypoint({ accessToken, waypointId: waypoint.id }).unwrap();
      } catch (error) {
        patch.undo();
        console.warn('Delete waypoint failed — full error:', JSON.stringify(error));
      }
    },
    [accessToken, toggleFavoriteWaypoint, patchRoadCache],
  );

  const handleOptionSelect = useCallback(
    async (option: WaypointOption, item: WaypointWithAddress) => {
      if (option === 'delete') await handleDelete(item.id);
      if (option === 'favorite') await toggleFavorite(item);
    },
    [handleDelete, toggleFavorite],
  );

  const updateOrder = useCallback(
    ({ from, to, data: newData }: DragEndParams<WaypointWithAddress>) => {
      if (from === to) return;

      const reordered = newData.map((item, index) => ({ ...item, order: index + 1 }));

      const patch = patchRoadCache((draft) => {
        draft.wayPoints = reordered;
      });

      reOrderWaypoints({
        accessToken,
        roadId,
        from,
        to,
      })
        .unwrap()
        .catch((error) => {
          patch.undo();
          console.error('Failed to update order:', error);
        });
    },
    [accessToken, roadId, reOrderWaypoints, patchRoadCache],
  );


  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<WaypointWithAddress>): JSX.Element => (
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
      onDragEnd={(data) => updateOrder(data)}
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