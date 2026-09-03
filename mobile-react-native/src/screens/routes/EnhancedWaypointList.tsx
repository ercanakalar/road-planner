import React, { useCallback } from 'react';

import {
  useDeleteWaypointByIdMutation,
  useGetRoadByIdQuery,
  useReOrderWaypointsMutation,
} from 'store/services/roadService';
import { useToggleFavoriteWaypointMutation } from 'store/services/favoriteService';

import WaypointList from 'components/map/WaypointList';
import useCopyAddress from 'hooks/useCopyAddress';
import { useModeDurations } from 'hooks/useRouteDirections';
import { showNotification } from 'services/notificationService';

import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

const EMPTY_WAYPOINTS: never[] = [];

interface Props {
  roadId: string;
  transportMode: TransportMode;
  /** Owned by the screen, because the map has to badge the same two stops. */
  selectedPair: string[];
  onToggleSelection: (waypointId: string) => void;
  onForgetSelection: (waypointId: string) => void;
  onTransportModeChange: (mode: TransportMode) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const EnhancedWaypointList = ({
  roadId,
  transportMode,
  selectedPair,
  onToggleSelection,
  onForgetSelection,
  onTransportModeChange,
  onReorderingChange,
}: Props) => {
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
  const copyAddress = useCopyAddress();

  const handleDelete = useCallback(
    async (waypointId: string) => {
      try {
        await deleteWaypointById({ roadId, waypointId }).unwrap();
        onForgetSelection(waypointId);
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not delete that waypoint.',
        });
      }
    },
    [deleteWaypointById, onForgetSelection, roadId],
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
      if (option === 'copy') return copyAddress(item.address);
      if (option === 'favorite') return toggleFavorite(item);
    },
    [copyAddress, handleDelete, toggleFavorite],
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
      onToggleSelection={onToggleSelection}
      onOptionSelect={handleOptionSelect}
      onReorder={handleReorder}
      onReorderingChange={onReorderingChange}
    />
  );
};

export default EnhancedWaypointList;
