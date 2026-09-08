import { useCallback } from 'react';

import { useAppSelector } from 'store/hook';

import StopList from 'components/map/StopList';
import useCopyAddress from 'hooks/common/useCopyAddress';
import { useModeDurations } from 'hooks/map/useRouteDirections';

import { StopWithAddress } from 'types/map-screen-type';
import { TransportMode, StopOption } from 'types/transport-type';

interface Props {
  stops: StopWithAddress[];
  transportMode: TransportMode;
  /** Owned by the screen, because the map has to badge the same two stops. */
  selectedPair: string[];
  onToggleSelection: (stopId: string) => void;
  onForgetSelection: (stopId: string) => void;
  onTransportModeChange: (mode: TransportMode) => void;
  onDeleteStop: (stopId: string) => void;
  onToggleFavoriteStop: (stopId: string) => void;
  onReorder: (params: { from: number; to: number }) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const LocalStopList = ({
  stops,
  transportMode,
  selectedPair,
  onToggleSelection,
  onForgetSelection,
  onTransportModeChange,
  onDeleteStop,
  onToggleFavoriteStop,
  onReorder,
  onReorderingChange,
}: Props) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const durations = useModeDurations(stops, selectedPair);
  const copyAddress = useCopyAddress();

  const handleOptionSelect = useCallback(
    (option: StopOption, item: StopWithAddress) => {
      if (option === 'favorite') {
        onToggleFavoriteStop(item.id);
        return;
      }

      if (option === 'copy') {
        copyAddress(item.address);
        return;
      }

      onDeleteStop(item.id);
      onForgetSelection(item.id);
    },
    [
      copyAddress,
      onDeleteStop,
      onForgetSelection,
      onToggleFavoriteStop,
    ],
  );

  return (
    <StopList
      stops={stops}
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

export default LocalStopList;
