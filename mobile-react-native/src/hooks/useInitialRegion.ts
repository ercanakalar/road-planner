import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { Region } from 'react-native-maps';

import { TURKEY_REGION, USER_LOCATION_DELTA } from 'constants/regions';

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

export interface InitialRegionState {
  region: Region;
  status: LocationStatus;
  isResolving: boolean;
}

let cached: { region: Region; status: LocationStatus } | null = null;

export const resolveRegion = async (): Promise<{
  region: Region;
  status: LocationStatus;
}> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      return { region: TURKEY_REGION, status: 'denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      region: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        ...USER_LOCATION_DELTA,
      },
      status: 'granted',
    };
  } catch {
    return { region: TURKEY_REGION, status: 'unavailable' };
  }
};

export function useInitialRegion(): InitialRegionState {
  const [state, setState] = useState<InitialRegionState>(() =>
    cached
      ? { ...cached, isResolving: false }
      : { region: TURKEY_REGION, status: 'pending', isResolving: true },
  );

  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (cached || hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    let cancelled = false;

    resolveRegion().then((resolved) => {
      cached = resolved;
      if (!cancelled) setState({ ...resolved, isResolving: false });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export const resetInitialRegionCache = () => {
  cached = null;
};

export default useInitialRegion;
