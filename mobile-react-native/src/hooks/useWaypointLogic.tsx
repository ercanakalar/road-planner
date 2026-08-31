import { useCallback, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView from 'react-native-maps';
import { MarkerDragEndEvent } from 'types/hooks/useMapLogic-type';
import { WaypointRoute } from 'types/screens/mapScreenType';
import { useGetWaypointByIdQuery } from 'store/services/roadService';
import { Waypoint } from 'types/store/services/roadService-type';

const useWaypointLogic = () => {
  const route = useRoute<WaypointRoute>();
  const { accessToken, waypointId } = route.params;

  const mapRef = useRef<MapView>(null);

  const {
    data,
    isLoading,
    isError,
  }: {
    data: Waypoint | undefined;
    isLoading: boolean;
    isError: boolean;
  } = useGetWaypointByIdQuery(
    { accessToken, waypointId },
    { skip: !accessToken || !waypointId },
  );

  const handleMarkerDragEnd = useCallback(
    (_event: MarkerDragEndEvent, _waypointId: string) => {},
    [],
  );

  const initialRegion = data
    ? {
        latitude: data.latitude,
        longitude: data.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : undefined;
  console.log(data);

  return {
    waypointId,
    mapRef,
    data,
    isLoading,
    isError,
    initialRegion,
    handleMarkerDragEnd,
  };
};

export default useWaypointLogic;
