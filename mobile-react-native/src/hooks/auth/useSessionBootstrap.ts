import { useEffect, useState } from 'react';

import jwtService from 'services/jwtService';
import tokenStorage from 'services/tokenStorage';
import kvkkStorage from 'services/kvkkStorage';
import preferencesStorage from 'services/preferencesStorage';
import localRouteStorage from 'services/localRouteStorage';
import travelMapStorage from 'services/travelMapStorage';
import { useAppDispatch } from 'store/hook';
import { sessionRestored } from 'store/slices/authSlice';
import { settingsRestored } from 'store/slices/settingsSlice';
import { localRoutesHydrated } from 'store/slices/localRouteSlice';
import { travelAreasHydrated } from 'store/slices/travelMapSlice';
import { kvkkHydrated } from 'store/slices/kvkkSlice';
import { JwtPayload } from 'types/services/jwt-service-type';

export function useSessionBootstrap(): boolean {
  const dispatch = useAppDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let consentHydrated = false;

    const restore = async () => {
      try {
        const [preferences, localRoutes, travelAreas, kvkkConsent] =
          await Promise.all([
            preferencesStorage.load(),
            localRouteStorage.load(),
            travelMapStorage.load(),
            kvkkStorage.load(),
          ]);
        if (cancelled) return;

        dispatch(settingsRestored(preferences));
        dispatch(localRoutesHydrated(localRoutes));
        dispatch(travelAreasHydrated(travelAreas));
        dispatch(kvkkHydrated(kvkkConsent));
        consentHydrated = true;

        await tokenStorage.migrateLegacyTokens();
        const { accessToken, refreshToken } = await tokenStorage.get();

        if (!accessToken || !refreshToken) {
          if (!cancelled) dispatch(sessionRestored(null));
          return;
        }

        const decoded = await jwtService.decodeToken<JwtPayload>(accessToken);
        if (cancelled) return;

        dispatch(
          sessionRestored({
            accessToken,
            refreshToken,
            userId: decoded?.userId ?? null,
          }),
        );
      } catch {
        if (cancelled) return;
        if (!consentHydrated) dispatch(kvkkHydrated(null));
        dispatch(sessionRestored(null));
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
