import { createListenerMiddleware, AnyAction } from '@reduxjs/toolkit';
import localStorageService from 'services/localStorageService';
import authenticationService from 'store/services/authenticationService';
import { TokenType } from 'types/libs/auth';

interface ActionPayload {
  status?: number;
  [key: string]: any;
}

interface TypedAction extends AnyAction {
  payload?: ActionPayload;
}

const authMiddleware = createListenerMiddleware();
let isRefreshing = false;

authMiddleware.startListening({
  predicate: (action: TypedAction) => {
    const is401 = action?.payload?.status === 401;
    const isRefreshAction = action?.meta?.args?.endpointName?.includes(
      'validateRefreshToken'
    );
    return is401 && !isRefreshAction && !isRefreshing;
  },

  effect: async (action, listenerApi) => {
    if (isRefreshing) return;
    isRefreshing = true;

    listenerApi.cancelActiveListeners();

    const allowed = await listenerApi.condition(() => true);
    if (!allowed) {
      isRefreshing = false;
      return;
    }

    const refreshToken = await localStorageService.getItem(
      TokenType.REFRESH_TOKEN
    );
    const accessToken = await localStorageService.getItem(
      TokenType.ACCESS_TOKEN
    );

    try {
      const result =
        await authenticationService.endpoints.validateRefreshToken.initiate({
          accessToken,
          refreshToken,
        })(listenerApi.dispatch, listenerApi.getState, undefined);

      if (result.error) {
        await localStorageService.removeItem(TokenType.ACCESS_TOKEN);
        await localStorageService.removeItem(TokenType.REFRESH_TOKEN);
        listenerApi.dispatch(authenticationService.util.resetApiState());
        listenerApi.dispatch(
          authenticationService.util.invalidateTags(['Authentication'])
        );
        listenerApi.dispatch({
          type: 'auth/logout',
          payload: {
            accessToken: null,
            refreshToken: null,
            user: null,
          },
        });

        isRefreshing = false;
        return;
      }

      if ((result.data as any)?.accessToken) {
        await localStorageService.setItem(
          TokenType.ACCESS_TOKEN,
          (result.data as any).accessToken
        );
        await localStorageService.setItem(
          TokenType.REFRESH_TOKEN,
          (result.data as any).refreshToken
        );
      }
    } catch (err) {
      console.error('Error during token refresh:', err);
      await localStorageService.removeItem(TokenType.ACCESS_TOKEN);
      await localStorageService.removeItem(TokenType.REFRESH_TOKEN);
    } finally {
      isRefreshing = false;
    }
  },
});

export default authMiddleware;
