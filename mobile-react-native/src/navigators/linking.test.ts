import { getStateFromPath } from '@react-navigation/native';

import { APP_SCHEME } from 'constants/shareLinks';
import linking from './linking';

const routeFor = (path: string) => {
  const state = getStateFromPath(path, linking.config);
  return state?.routes?.[state.routes.length - 1];
};

describe('deep link routing', () => {
  it('opens a share link on the shared route screen', () => {
    const route = routeFor('/share/abc.def.ghi');

    expect(route?.name).toBe('SharedRouteScreen');
    expect(route?.params).toEqual({ token: 'abc.def.ghi' });
  });

  it('claims the app scheme, so a link works with no web host at all', () => {
    expect(linking.prefixes).toContain(`${APP_SCHEME}://`);
  });

  it('leaves paths it does not own unrouted', () => {
    expect(routeFor('/road/abc')).toBeUndefined();
    expect(routeFor('/share')).toBeUndefined();
  });
});
