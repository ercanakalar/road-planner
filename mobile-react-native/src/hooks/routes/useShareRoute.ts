import { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';

import { buildShareLink } from 'constants/shareLinks';
import { useLazyShareRouteQuery } from 'store/services/routeService';

interface ShareableRoute {
  id: string;
  title: string;
}

const shareMessage = (title: string, url: string): string =>
  `${title}\n${url}`;

interface ShareRouteState {
  shareRoute: (route: ShareableRoute) => Promise<void>;
  sharingRouteId: string | null;
}

export function useShareRoute(): ShareRouteState {
  const [requestShareLink] = useLazyShareRouteQuery();
  const [sharingRouteId, setSharingRouteId] = useState<string | null>(null);

  const shareRoute = useCallback(
    async (route: ShareableRoute) => {
      setSharingRouteId(route.id);

      try {
        const link = await requestShareLink({ routeId: route.id }).unwrap();
        const url = buildShareLink(link.token, link.url);
        const message = shareMessage(route.title, url);

        await Share.share(
          Platform.OS === 'ios' ? { message: route.title, url } : { message },
          { dialogTitle: `Share ${route.title}` },
        );
      } catch {
      } finally {
        setSharingRouteId(null);
      }
    },
    [requestShareLink],
  );

  return { shareRoute, sharingRouteId };
}

export default useShareRoute;
