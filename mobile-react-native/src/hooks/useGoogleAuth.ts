import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import appConfig from 'constants/appConfig';
import { useSignInWithGoogleMutation } from 'store/services/authenticationService';

WebBrowser.maybeCompleteAuthSession();

export const selectGoogleClientId = (
  os: string,
  ids: { ios?: string; android?: string; web?: string },
): string => {
  if (os === 'ios') return ids.ios ?? '';
  if (os === 'android') return ids.android ?? '';
  return ids.web ?? '';
};

const PLACEHOLDER_CLIENT_ID = 'unconfigured.apps.googleusercontent.com';

export const googleClientId = selectGoogleClientId(Platform.OS, {
  ios: appConfig.googleIosClientId,
  android: appConfig.googleAndroidClientId,
  web: appConfig.googleWebClientId,
});

export const isGoogleAuthConfigured = Boolean(googleClientId);

export interface GoogleAuthState {
  isAvailable: boolean;
  isBusy: boolean;
  signIn: () => Promise<void>;
}

export function useGoogleAuth(onSuccess?: () => void): GoogleAuthState {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId || PLACEHOLDER_CLIENT_ID,
  });

  const [signInWithGoogle, { isLoading }] = useSignInWithGoogleMutation();
  const exchanged = useRef<string | null>(null);

  useEffect(() => {
    if (response?.type !== 'success') return;

    const idToken = response.params?.id_token;
    if (!idToken || exchanged.current === idToken) return;
    exchanged.current = idToken;

    signInWithGoogle({ idToken })
      .unwrap()
      .then(() => onSuccess?.())
      .catch(() => {
        exchanged.current = null;
      });
  }, [onSuccess, response, signInWithGoogle]);

  const signIn = useCallback(async () => {
    if (!request) return;
    await promptAsync();
  }, [promptAsync, request]);

  return {
    isAvailable: isGoogleAuthConfigured && !!request,
    isBusy: isLoading,
    signIn,
  };
}

export default useGoogleAuth;
