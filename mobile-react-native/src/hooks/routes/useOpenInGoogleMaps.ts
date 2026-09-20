import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import {
  buildGoogleMapsRouteUrl,
  GOOGLE_MAPS_STOP_LIMIT,
} from 'constants/googleMapsLink';
import { showNotification } from 'services/notificationService';
import { useLazyGetRouteByIdQuery } from 'store/services/routeService';

import { RouteCoordinate } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';
import { useTranslation } from 'react-i18next';

export type OpenInGoogleMaps = (
  stops: readonly RouteCoordinate[],
  mode?: TransportMode,
) => Promise<void>;

export function useOpenInGoogleMaps(): OpenInGoogleMaps {
  const { t } = useTranslation();

  return useCallback(
    async (stops, mode) => {
      const link = buildGoogleMapsRouteUrl(stops, mode);

      if (!link) {
        showNotification({
          type: 'info',
          header: t('toast.nothingToNavigate'),
          message: t('toast.addAStopFirst'),
        });
        return;
      }

      if (link.omittedCount > 0) {
        showNotification({
          type: 'info',
          header: t('toast.routeShortened'),
          message: t('toast.routeShortenedMessage', {
            limit: GOOGLE_MAPS_STOP_LIMIT,
            omitted: link.omittedCount,
          }),
          visibilityTime: 2500,
        });
      }

      try {
        await Linking.openURL(link.url);
      } catch {
        showNotification({
          type: 'error',
          header: t('toast.couldNotOpenGoogleMaps'),
          message: t('toast.nothingCouldOpen'),
        });
      }
    },
    [t],
  );
}

interface OpenRouteInGoogleMaps {
  openRouteInGoogleMaps: (routeId: string) => Promise<void>;
  openingRouteId: string | null;
}

export function useOpenRouteInGoogleMaps(): OpenRouteInGoogleMaps {
  const { t } = useTranslation();
  const [fetchRoute] = useLazyGetRouteByIdQuery();
  const openInGoogleMaps = useOpenInGoogleMaps();
  const [openingRouteId, setOpeningRouteId] = useState<string | null>(null);

  const openRouteInGoogleMaps = useCallback(
    async (routeId: string) => {
      setOpeningRouteId(routeId);

      try {
        const route = await fetchRoute({ routeId }).unwrap();
        await openInGoogleMaps(route.stops);
      } catch {
        showNotification({
          type: 'error',
          header: t('toast.couldNotOpenGoogleMaps'),
          message: t('toast.routeCouldNotLoad'),
        });
      } finally {
        setOpeningRouteId(null);
      }
    },
    [fetchRoute, openInGoogleMaps, t],
  );

  return { openRouteInGoogleMaps, openingRouteId };
}

export default useOpenInGoogleMaps;
