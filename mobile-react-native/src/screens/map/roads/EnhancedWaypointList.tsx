import React, { useCallback, useState } from 'react';

import {
  useDeleteWaypointByIdMutation,
  useGetRoadByIdQuery,
  useReOrderWaypointsMutation,
} from 'store/services/roadService';
import { useToggleFavoriteWaypointMutation } from 'store/services/favoriteService';

import WaypointList from './WaypointList';
import { useModeDurations } from 'hooks/useRouteDirections';
import { showNotification } from 'services/notificationService';

import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

const EMPTY_WAYPOINTS: never[] = [];

interface Props {
  roadId: string;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const EnhancedWaypointList = ({
  roadId,
  transportMode,
  onTransportModeChange,
  onReorderingChange,
}: Props) => {
  const [selectedPair, setSelectedPair] = useState<string[]>([]);

  const { waypoints } = useGetRoadByIdQuery(
    { roadId },
    {
      skip: !roadId,
      selectFromResult: ({ data }) => ({
        waypoints: data?.wayPoints ?? EMPTY_WAYPOINTS,
      }),
    },
  );

  const [deleteWaypointById] = useDeleteWaypointByIdMutation();
  const [reOrderWaypoints] = useReOrderWaypointsMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();

  const durations = useModeDurations(waypoints, selectedPair);

  const toggleSelection = useCallback((id: string) => {
    setSelectedPair((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }
      return previous.length < 2 ? [...previous, id] : [previous[1], id];
    });
  }, []);

  const handleDelete = useCallback(
    async (waypointId: string) => {
      try {
        await deleteWaypointById({ roadId, waypointId }).unwrap();
        setSelectedPair((previous) =>
          previous.filter((id) => id !== waypointId),
        );
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not delete that waypoint.',
        });
      }
    },
    [deleteWaypointById, roadId],
  );

  const toggleFavorite = useCallback(
    async (waypoint: WaypointWithAddress) => {
      try {
        await toggleFavoriteWaypoint({
          waypointId: waypoint.id,
          roadId,
        }).unwrap();
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not update favourites.',
        });
      }
    },
    [roadId, toggleFavoriteWaypoint],
  );

  const handleOptionSelect = useCallback(
    (option: WaypointOption, item: WaypointWithAddress) => {
      if (option === 'delete') return handleDelete(item.id);
      if (option === 'favorite') return toggleFavorite(item);
    },
    [handleDelete, toggleFavorite],
  );

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      reOrderWaypoints({ roadId, from, to });
    },
    [reOrderWaypoints, roadId],
  );

  return (
    <WaypointList
      waypoints={waypoints}
      selectedPair={selectedPair}
      durations={durations}
      transportMode={transportMode}
      onTransportModeChange={onTransportModeChange}
      onToggleSelection={toggleSelection}
      onOptionSelect={handleOptionSelect}
      onReorder={handleReorder}
      onReorderingChange={onReorderingChange}
    />
  );
};

export default EnhancedWaypointList;
