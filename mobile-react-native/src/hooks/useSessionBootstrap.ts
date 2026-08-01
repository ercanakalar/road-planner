import { useEffect, useState } from 'react';

import jwtService from 'services/jwtService';
import tokenStorage from 'services/tokenStorage';
import preferencesStorage from 'services/preferencesStorage';
import localRoadStorage from 'services/localRoadStorage';
import { useAppDispatch } from 'store/hook';
import { sessionRestored } from 'store/slices/authSlice';
import { settingsRestored } from 'store/slices/settingsSlice';
import { localRoadsHydrated } from 'store/slices/localRoadSlice';
import { JwtPayload } from 'types/services/jwt-service-type';

export function useSessionBootstrap(): boolean {
  const dispatch = useAppDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const [preferences, localRoads] = await Promise.all([
          preferencesStorage.load(),
          localRoadStorage.load(),
        ]);
        if (cancelled) return;

        dispatch(settingsRestored(preferences));
        dispatch(localRoadsHydrated(localRoads));

        await tokenStorage.migrateLegacyTokens();
        const { accessToken, refreshToken } = await tokenStorage.get();

        if (!accessToken || !refreshToken) {
          if (!cancelled) dispatch(sessionRestored(null));
          return;
        }

        const decoded = await jwtService.decodeToken<JwtPayload>();
        if (cancelled) return;

        dispatch(
          sessionRestored({
            accessToken,
            refreshToken,
            userId: decoded?.userId ?? null,
          }),
        );
      } catch {
        if (!cancelled) dispatch(sessionRestored(null));
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return isReady;
}

export default useSessionBootstrap;
