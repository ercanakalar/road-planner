import type { LinkingOptions } from '@react-navigation/native';

import { linkingPrefixes, ROUTE_PATH, SHARE_PATH } from 'constants/shareLinks';
import { RootStackParamList } from 'types/screens/screens';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: linkingPrefixes(),
  config: {
    screens: {
      SharedRouteScreen: `${SHARE_PATH}/:token`,
      // What the "they published a route" email links to. The screen reads
      // nothing but the id from these params; the title is its own fallback.
      CommunityRouteScreen: `${ROUTE_PATH}/:routeId`,
    },
  },
};

export default linking;
