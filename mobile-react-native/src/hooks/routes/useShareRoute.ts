import { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildShareLink } from 'constants/shareLinks';
import { useLazyShareRouteQuery } from 'store/services/routeService';

interface ShareableRoute {
  id: string;
  title: string;
}

interface ShareRouteState {
  shareRoute: (route: ShareableRoute) => Promise<void>;
  sharingRouteId: string | null;
}

export function useShareRoute(): ShareRouteState {
  const { t } = useTranslation();
  const [requestShareLink] = useLazyShareRouteQuery();
  const [sharingRouteId, setSharingRouteId] = useState<string | null>(null);

  const shareRoute = useCallback(
    async (route: ShareableRoute) => {
      setSharingRouteId(route.id);

      try {
        const link = await requestShareLink({ routeId: route.id }).unwrap();
        const url = buildShareLink(link.token, link.url);
        const message = t('share.message', { title: route.title, url });

        await Share.share(
          Platform.OS === 'ios'
            ? {
                message: t('share.messageWithoutLink', { title: route.title }),
                url,
              }
            : { message },
          { dialogTitle: t('share.dialogTitle', { title: route.title }) },
        );
      } catch {
      } finally {
        setSharingRouteId(null);
      }
    },
    [requestShareLink, t],
  );

  return { shareRoute, sharingRouteId };
}

export default useShareRoute;
