import React, { useCallback } from 'react';

import { useAppSelector } from 'store/hook';

import WaypointList from 'components/map/WaypointList';
import useCopyAddress from 'hooks/useCopyAddress';
import { useModeDurations } from 'hooks/useRouteDirections';

import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

interface Props {
  waypoints: WaypointWithAddress[];
  transportMode: TransportMode;
  /** Owned by the screen, because the map has to badge the same two stops. */
  selectedPair: string[];
  onToggleSelection: (waypointId: string) => void;
  onForgetSelection: (waypointId: string) => void;
  onTransportModeChange: (mode: TransportMode) => void;
  onDeleteWaypoint: (waypointId: string) => void;
  onToggleFavoriteWaypoint: (waypointId: string) => void;
  onReorder: (params: { from: number; to: number }) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const LocalWaypointList = ({
  waypoints,
  transportMode,
  selectedPair,
  onToggleSelection,
  onForgetSelection,
  onTransportModeChange,
  onDeleteWaypoint,
  onToggleFavoriteWaypoint,
  onReorder,
  onReorderingChange,
}: Props) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const durations = useModeDurations(waypoints, selectedPair);
  const copyAddress = useCopyAddress();

  const handleOptionSelect = useCallback(
    (option: WaypointOption, item: WaypointWithAddress) => {
      if (option === 'favorite') {
        onToggleFavoriteWaypoint(item.id);
        return;
      }

      if (option === 'copy') {
        copyAddress(item.address);
        return;
      }

      onDeleteWaypoint(item.id);
      onForgetSelection(item.id);
    },
    [
      copyAddress,
      onDeleteWaypoint,
      onForgetSelection,
      onToggleFavoriteWaypoint,
    ],
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
      showFavoriteAction={isLoggedIn}
      onReorder={onReorder}
      onReorderingChange={onReorderingChange}
    />
  );
};

export default LocalWaypointList;
