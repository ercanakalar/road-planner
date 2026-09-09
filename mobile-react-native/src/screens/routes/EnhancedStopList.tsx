import { useCallback, useMemo } from 'react';

import {
  useDeleteStopByIdMutation,
  useGetRoadByIdQuery,
  useGetRoadTerrainQuery,
  useReOrderStopsMutation,
} from 'store/services/roadService';
import { useToggleFavoriteStopMutation } from 'store/services/favoriteService';

import StopList from 'components/map/StopList';
import useCopyAddress from 'hooks/common/useCopyAddress';
import { useModeDurations } from 'hooks/map/useRouteDirections';
import { showNotification } from 'services/notificationService';

import { StopWithAddress } from 'types/map-screen-type';
import { TransportMode, StopOption } from 'types/transport-type';

const EMPTY_STOPS: never[] = [];

interface Props {
  roadId: string;
  transportMode: TransportMode;
  /** Owned by the screen, because the map has to badge the same two stops. */
  selectedPair: string[];
  onToggleSelection: (stopId: string) => void;
  onForgetSelection: (stopId: string) => void;
  onTransportModeChange: (mode: TransportMode) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const EnhancedStopList = ({
  roadId,
  transportMode,
  selectedPair,
  onToggleSelection,
  onForgetSelection,
  onTransportModeChange,
  onReorderingChange,
}: Props) => {
  const { stops } = useGetRoadByIdQuery(
    { roadId },
    {
      skip: !roadId,
      selectFromResult: ({ data }) => ({
        stops: data?.stops ?? EMPTY_STOPS,
      }),
    },
  );

  // The stops already carry a shape worked out from the straight lines between
  // them. This asks for the same reading taken along the road Google actually
  // routes, which is the one worth showing when it arrives: two stops either
  // side of a valley are not a climb, and the pins alone cannot tell.
  //
  // A leg needs two stops. Below that there is nothing to measure, so nothing
  // is asked for.
  const { data: terrain } = useGetRoadTerrainQuery(
    { roadId },
    { skip: !roadId || stops.length < 2 },
  );

  const measuredStops = useMemo(() => {
    if (!terrain?.length) return stops;

    const byStop = new Map(terrain.map(({ stopId, shape }) => [stopId, shape]));

    return stops.map((stop) => {
      const shape = byStop.get(stop.id);
      return shape ? { ...stop, ...shape } : stop;
    });
  }, [stops, terrain]);

  const [deleteStopById] = useDeleteStopByIdMutation();
  const [reOrderStops] = useReOrderStopsMutation();
  const [toggleFavoriteStop] = useToggleFavoriteStopMutation();

  const durations = useModeDurations(measuredStops, selectedPair);
  const copyAddress = useCopyAddress();

  const handleDelete = useCallback(
    async (stopId: string) => {
      try {
        await deleteStopById({ roadId, stopId }).unwrap();
        onForgetSelection(stopId);
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not delete that stop.',
        });
      }
    },
    [deleteStopById, onForgetSelection, roadId],
  );

  const toggleFavorite = useCallback(
    async (stop: StopWithAddress) => {
      try {
        await toggleFavoriteStop({
          stopId: stop.id,
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
    [roadId, toggleFavoriteStop],
  );

  const handleOptionSelect = useCallback(
    (option: StopOption, item: StopWithAddress) => {
      if (option === 'delete') return handleDelete(item.id);
      if (option === 'copy') return copyAddress(item.address);
      if (option === 'favorite') return toggleFavorite(item);
    },
    [copyAddress, handleDelete, toggleFavorite],
  );

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      reOrderStops({ roadId, from, to });
    },
    [reOrderStops, roadId],
  );

  return (
    <StopList
      stops={measuredStops}
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

export default EnhancedStopList;
