import { useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView, { Region } from 'react-native-maps';

import { useGetStopByIdQuery } from 'store/services/roadService';
import { StopRoute } from 'types/screens/mapScreenType';

const DELTA = 0.01;

const useStopLogic = () => {
  const route = useRoute<StopRoute>();
  const { stopId } = route.params;

  const mapRef = useRef<MapView>(null);

  const { data, isLoading, isError } = useGetStopByIdQuery(
    { stopId },
    { skip: !stopId },
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

  return { stopId, mapRef, data, isLoading, isError, initialRegion };
};

export default useStopLogic;
