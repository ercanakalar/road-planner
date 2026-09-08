import { useEffect, useState } from 'react';

import jwtService from 'services/jwtService';
import tokenStorage from 'services/tokenStorage';
import kvkkStorage from 'services/kvkkStorage';
import preferencesStorage from 'services/preferencesStorage';
import localRoadStorage from 'services/localRoadStorage';
import { useAppDispatch } from 'store/hook';
import { sessionRestored } from 'store/slices/authSlice';
import { settingsRestored } from 'store/slices/settingsSlice';
import { localRoadsHydrated } from 'store/slices/localRoadSlice';
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
        const [preferences, localRoads, kvkkConsent] = await Promise.all([
          preferencesStorage.load(),
          localRoadStorage.load(),
          kvkkStorage.load(),
        ]);
        if (cancelled) return;

        dispatch(settingsRestored(preferences));
        dispatch(localRoadsHydrated(localRoads));
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
        // A stored consent that was already read stands: a failure further
        // down the restore is no reason to ask for it again.
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
