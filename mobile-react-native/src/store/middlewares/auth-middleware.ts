import { createListenerMiddleware, UnknownAction } from '@reduxjs/toolkit';
import localStorageService from 'services/localStorageService';
import { resetAllApiStates } from 'store/actions/authAction';
import { authenticationService } from 'store/services/authenticationService';
import { TokenType } from 'types/libs/auth';

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface RejectedAction extends UnknownAction {
  payload?: { status?: number };
  meta?: { arg?: { endpointName?: string } };
}

function isRejectedWith401(action: unknown): action is RejectedAction {
  const a = action as RejectedAction;
  return a?.payload?.status === 401;
}

function isValidateRefreshTokenAction(action: RejectedAction): boolean {
  return (
    action.meta?.arg?.endpointName?.includes('validateRefreshToken') ?? false
  );
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    localStorageService.removeItem(TokenType.ACCESS_TOKEN),
    localStorageService.removeItem(TokenType.REFRESH_TOKEN),
  ]);
}

const authMiddleware = createListenerMiddleware();
let isRefreshing = false;

authMiddleware.startListening({
  predicate: (action) => {
    if (!isRejectedWith401(action)) return false;
    if (isValidateRefreshTokenAction(action)) return false;
    return !isRefreshing;
  },

  effect: async (_action, listenerApi) => {
    if (isRefreshing) return;
    isRefreshing = true;
    listenerApi.cancelActiveListeners();

    try {
      const [accessToken, refreshToken] = await Promise.all([
        localStorageService.getItem(TokenType.ACCESS_TOKEN),
        localStorageService.getItem(TokenType.REFRESH_TOKEN),
      ]);

      const result =
        await authenticationService.endpoints.validateRefreshToken.initiate({
          accessToken,
          refreshToken,
        })(listenerApi.dispatch, listenerApi.getState, undefined);

      if (result.error) {
        await clearTokens();
        resetAllApiStates();
        return;
      }

      const data = result.data as RefreshTokenResponse | undefined;

      if (data?.accessToken && data?.refreshToken) {
        await Promise.all([
          localStorageService.setItem(TokenType.ACCESS_TOKEN, data.accessToken),
          localStorageService.setItem(
            TokenType.REFRESH_TOKEN,
            data.refreshToken,
          ),
        ]);
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      await clearTokens();
      resetAllApiStates();
    } finally {
      isRefreshing = false;
    }
  },
});

export default authMiddleware;
