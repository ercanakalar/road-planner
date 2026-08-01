import { useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView, { Region } from 'react-native-maps';

import { useGetWaypointByIdQuery } from 'store/services/roadService';
import { WaypointRoute } from 'types/screens/mapScreenType';

const DELTA = 0.01;

const useWaypointLogic = () => {
  const route = useRoute<WaypointRoute>();
  const { waypointId } = route.params;

  const mapRef = useRef<MapView>(null);

  const { data, isLoading, isError } = useGetWaypointByIdQuery(
    { waypointId },
    { skip: !waypointId },
  );

  const initialRegion = useMemo<Region | undefined>(
    () =>
      data
        ? {
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: DELTA,
            longitudeDelta: DELTA,
          }
        : undefined,
    [data],
  );

  return { waypointId, mapRef, data, isLoading, isError, initialRegion };
};

export default useWaypointLogic;
