import reducer, {
  logout,
  sessionRestored,
  setUserId,
} from './authSlice';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import { authenticationService } from 'store/services/authenticationService';
import { authInitialState } from 'types/store/auth-type';

const session = {
  userId: 'u1',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

const fulfilled = (endpoint: 'signIn' | 'signUp' | 'validateRefreshToken') => ({
  type: `${authenticationService.reducerPath}/executeMutation/fulfilled`,
  payload: session,
  meta: {
    arg: { endpointName: endpoint, type: 'mutation' },
    requestId: 'req-1',
    requestStatus: 'fulfilled',
  },
});

describe('authSlice', () => {
  it('starts signed out', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual(authInitialState);
  });

  it('restores a persisted session at startup', () => {
    const state = reducer(undefined, sessionRestored(session));

    expect(state).toMatchObject({
      isLoggedIn: true,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 'u1',
      state: 'authenticated',
      isLoading: false,
    });
  });

  it('stays signed out when there is nothing to restore', () => {
    const state = reducer(undefined, sessionRestored(null));
    expect(state).toMatchObject({ isLoggedIn: false, accessToken: null });
  });

  it('applies a background token refresh', () => {
    const signedIn = reducer(undefined, sessionRestored(session));
    const state = reducer(
      signedIn,
      sessionRefreshed({ accessToken: 'access-2', refreshToken: 'refresh-2' }),
    );

    expect(state.accessToken).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-2');
    expect(state.userId).toBe('u1');
    expect(state.isLoggedIn).toBe(true);
  });

  it.each(['signIn', 'signUp', 'validateRefreshToken'] as const)(
    'signs the user in on %s',
    (endpoint) => {
      const state = reducer(undefined, fulfilled(endpoint));
      expect(state).toMatchObject({
        isLoggedIn: true,
        accessToken: 'access-1',
        userId: 'u1',
      });
    },
  );

  it.each([
    ['logout', logout()],
    ['sessionCleared', sessionCleared()],
  ])('clears every credential on %s', (_label, action) => {
    const signedIn = reducer(undefined, sessionRestored(session));
    const state = reducer(signedIn, action);

    expect(state).toMatchObject({
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      state: 'initial',
    });
  });

  it('records the user id on its own', () => {
    expect(reducer(undefined, setUserId('u9')).userId).toBe('u9');
  });
});
