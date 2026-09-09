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

export type OpenInGoogleMaps = (
  stops: readonly RouteCoordinate[],
  mode?: TransportMode,
) => Promise<void>;

/**
 * Hands a finished route over to Google Maps for the drive itself. The link is
 * the free Maps URLs scheme, so navigating a route costs the app nothing on top
 * of what planning it already did.
 */
export function useOpenInGoogleMaps(): OpenInGoogleMaps {
  return useCallback(async (stops, mode) => {
    const link = buildGoogleMapsRouteUrl(stops, mode);

    if (!link) {
      showNotification({
        type: 'info',
        header: 'Nothing to navigate',
        message: 'Add a stop to this route first.',
      });
      return;
    }

    // The app is about to go to the background, where a toast would never be
    // read, so the warning has to land before the handover.
    if (link.omittedCount > 0) {
      showNotification({
        type: 'info',
        header: 'Route shortened',
        message: `Google Maps takes ${GOOGLE_MAPS_STOP_LIMIT} stops between the ends, so ${link.omittedCount} of yours were left out.`,
        visibilityTime: 2500,
      });
    }

    try {
      await Linking.openURL(link.url);
    } catch {
      showNotification({
        type: 'error',
        header: 'Could not open Google Maps',
        message: 'Nothing on this phone could open the route.',
      });
    }
  }, []);
}

interface OpenRouteInGoogleMaps {
  openRouteInGoogleMaps: (routeId: string) => Promise<void>;
  /** The route being fetched, so its row can show it is busy. */
  openingRouteId: string | null;
}

/**
 * The same handover from a list, where only the route's id is at hand and its
 * stops still have to be fetched.
 */
export function useOpenRouteInGoogleMaps(): OpenRouteInGoogleMaps {
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
          header: 'Could not open Google Maps',
          message: 'This route could not be loaded. Please try again.',
        });
      } finally {
        setOpeningRouteId(null);
      }
    },
    [fetchRoute, openInGoogleMaps],
  );

  return { openRouteInGoogleMaps, openingRouteId };
}

export default useOpenInGoogleMaps;
