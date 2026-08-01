import React, { useCallback, useState } from 'react';

import WaypointList from 'screens/map/roads/WaypointList';
import { useModeDurations } from 'hooks/useRouteDirections';

import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

interface Props {
  waypoints: WaypointWithAddress[];
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  onDeleteWaypoint: (waypointId: string) => void;
  onReorder: (params: { from: number; to: number }) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}


const LocalWaypointList = ({
  waypoints,
  transportMode,
  onTransportModeChange,
  onDeleteWaypoint,
  onReorder,
  onReorderingChange,
}: Props) => {
  const [selectedPair, setSelectedPair] = useState<string[]>([]);

  const durations = useModeDurations(waypoints, selectedPair);

  const toggleSelection = useCallback((id: string) => {
    setSelectedPair((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }
      return previous.length < 2 ? [...previous, id] : [previous[1], id];
    });
  }, []);

  const handleOptionSelect = useCallback(
    (option: WaypointOption, item: WaypointWithAddress) => {
      if (option !== 'delete') return;
      onDeleteWaypoint(item.id);
      setSelectedPair((previous) => previous.filter((id) => id !== item.id));
    },
    [onDeleteWaypoint],
  );

  return (
    <WaypointList
      waypoints={waypoints}
      selectedPair={selectedPair}
      durations={durations}
      transportMode={transportMode}
      showFavoriteAction={false}
      onTransportModeChange={onTransportModeChange}
      onToggleSelection={toggleSelection}
      onOptionSelect={handleOptionSelect}
      onReorder={onReorder}
      onReorderingChange={onReorderingChange}
    />
  );
};

export default LocalWaypointList;
