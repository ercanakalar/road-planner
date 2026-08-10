import type { LinkingOptions } from '@react-navigation/native';

import { linkingPrefixes, SHARE_PATH } from 'constants/shareLinks';
import { RootStackParamList } from 'types/screens/screens';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: linkingPrefixes(),
  config: {
    screens: {
      SharedRouteScreen: `${SHARE_PATH}/:token`,
    },
  },
};

export default linking;
