import { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';

import { buildShareLink } from 'constants/shareLinks';
import { useLazyShareRoadQuery } from 'store/services/roadService';

interface ShareableRoad {
  id: string;
  title: string;
}

const shareMessage = (title: string, url: string): string =>
  `${title}\n${url}`;

interface ShareRoadState {
  shareRoad: (road: ShareableRoad) => Promise<void>;
  sharingRoadId: string | null;
}

export function useShareRoad(): ShareRoadState {
  const [requestShareLink] = useLazyShareRoadQuery();
  const [sharingRoadId, setSharingRoadId] = useState<string | null>(null);

  const shareRoad = useCallback(
    async (road: ShareableRoad) => {
      setSharingRoadId(road.id);

      try {
        const link = await requestShareLink({ roadId: road.id }).unwrap();
        const url = buildShareLink(link.token, link.url);
        const message = shareMessage(road.title, url);

        await Share.share(
          Platform.OS === 'ios' ? { message: road.title, url } : { message },
          { dialogTitle: `Share ${road.title}` },
        );
      } catch {
      } finally {
        setSharingRoadId(null);
      }
    },
    [requestShareLink],
  );

  return { shareRoad, sharingRoadId };
}

export default useShareRoad;
