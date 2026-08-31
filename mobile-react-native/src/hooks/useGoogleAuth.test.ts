import {
  describeAuthResponse,
  describeSignInError,
  nativeApplicationId,
  selectGoogleClientId,
} from './useGoogleAuth';

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

describe('nativeApplicationId', () => {
  const config = {
    android: { package: 'net.travelroutes.travelroutes' },
    ios: { bundleIdentifier: 'net.travelroutes.ios' },
    scheme: 'net.travelroutes.scheme',
  };

  it('is the package name on Android', () => {
    expect(nativeApplicationId('android', config)).toBe(
      'net.travelroutes.travelroutes',
    );
  });

  it('is the bundle identifier on iOS', () => {
    expect(nativeApplicationId('ios', config)).toBe('net.travelroutes.ios');
  });

  it('falls back to the declared scheme', () => {
    expect(nativeApplicationId('android', { scheme: 'fallback.scheme' })).toBe(
      'fallback.scheme',
    );
  });

  it('takes the first of several schemes', () => {
    expect(nativeApplicationId('ios', { scheme: ['first', 'second'] })).toBe(
      'first',
    );
  });

  it('reports nothing rather than an invented id', () => {
    expect(nativeApplicationId('android', {})).toBe('');
    expect(nativeApplicationId('android', null)).toBe('');
  });
});

describe('describeAuthResponse', () => {
  const success = (params: Record<string, string>) =>
    ({
      type: 'success',
      params,
      errorCode: null,
      authentication: null,
      url: 'https://example.test',
    }) as const;

  it('reads the authorization code out of a successful response', () => {
    expect(describeAuthResponse(success({ code: 'auth-code' }))).toEqual({
      status: 'success',
      code: 'auth-code',
    });
  });

  it.each(['cancel', 'dismiss'] as const)(
    'treats %s as the user backing out, not a failure',
    (type) => {
      expect(describeAuthResponse({ type })).toEqual({ status: 'cancelled' });
    },
  );

  it('reports a success carrying no code, rather than going quiet', () => {
    const outcome = describeAuthResponse(success({}));

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('message', expect.stringContaining('code'));
  });

  it('prefers Google’s own description of a failed request', () => {
    const outcome = describeAuthResponse(
      success({ error_description: 'redirect_uri_mismatch' }),
    );

    expect(outcome).toEqual({
      status: 'failed',
      message: 'redirect_uri_mismatch',
    });
  });

  it('reports an error response with the error Google sent', () => {
    const outcome = describeAuthResponse({
      type: 'error',
      params: { error: 'invalid_client' },
      errorCode: 'invalid_client',
      error: null,
      authentication: null,
      url: 'https://example.test',
    });

    expect(outcome).toEqual({ status: 'failed', message: 'invalid_client' });
  });

  it('says something even when the error carries nothing', () => {
    const outcome = describeAuthResponse({
      type: 'error',
      params: {},
      errorCode: null,
      error: null,
      authentication: null,
      url: 'https://example.test',
    });

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('message', expect.any(String));
  });

  it('reports a session iOS refused to open over another', () => {
    const outcome = describeAuthResponse({ type: 'locked' });

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty(
      'message',
      expect.stringContaining('already open'),
    );
  });

  it('waits rather than reacting while the browser is still open', () => {
    expect(describeAuthResponse({ type: 'opened' })).toEqual({
      status: 'pending',
    });
  });
});

describe('describeSignInError', () => {
  it('names an unreachable server rather than blaming Google', () => {
    expect(describeSignInError({ status: 'FETCH_ERROR' })).toMatch(
      /could not reach the server/i,
    );
  });

  it('reports a timeout as one', () => {
    expect(describeSignInError({ status: 'TIMEOUT_ERROR' })).toMatch(/too long/i);
  });

  it('passes the API’s own message through', () => {
    expect(
      describeSignInError({ status: 401, data: { message: 'Google sign-in failed' } }),
    ).toBe('Google sign-in failed');
  });

  it('takes the first message of a validation list', () => {
    expect(
      describeSignInError({ status: 400, data: { message: ['idToken is required'] } }),
    ).toBe('idToken is required');
  });

  it('points at the audience setting when the API rejects the token', () => {
    expect(describeSignInError({ status: 401 })).toMatch(
      /GOOGLE_NATIVE_CLIENT_IDS/,
    );
  });

  it('says the server is unconfigured on a 503', () => {
    expect(describeSignInError({ status: 503 })).toMatch(/not configured/i);
  });

  it('still names the status of an answer it has no wording for', () => {
    expect(describeSignInError({ status: 500 })).toContain('500');
  });

  it('uses the message of a thrown error', () => {
    expect(describeSignInError(new Error('Google issued no id token'))).toBe(
      'Google issued no id token',
    );
  });

  it('falls back to something rather than an empty message', () => {
    expect(describeSignInError(undefined)).toMatch(/failed/i);
    expect(describeSignInError(new Error(''))).toMatch(/failed/i);
  });
});
