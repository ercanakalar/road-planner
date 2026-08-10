import { selectGoogleClientId } from './useGoogleAuth';

const ids = {
  ios: 'ios-id.apps.googleusercontent.com',
  android: 'android-id.apps.googleusercontent.com',
  web: 'web-id.apps.googleusercontent.com',
};

describe('selectGoogleClientId', () => {
  it('uses the client id belonging to the platform', () => {
    expect(selectGoogleClientId('ios', ids)).toBe(ids.ios);
    expect(selectGoogleClientId('android', ids)).toBe(ids.android);
    expect(selectGoogleClientId('web', ids)).toBe(ids.web);
  });

  it('never substitutes the web client on a native platform', () => {
    const webOnly = { web: ids.web };

    expect(selectGoogleClientId('android', webOnly)).toBe('');
    expect(selectGoogleClientId('ios', webOnly)).toBe('');
  });

  it('never substitutes a native client on another native platform', () => {
    expect(selectGoogleClientId('android', { ios: ids.ios })).toBe('');
    expect(selectGoogleClientId('ios', { android: ids.android })).toBe('');
  });

  it('reports nothing configured rather than guessing', () => {
    expect(selectGoogleClientId('android', {})).toBe('');
    expect(selectGoogleClientId('android', { android: '' })).toBe('');
  });
});
