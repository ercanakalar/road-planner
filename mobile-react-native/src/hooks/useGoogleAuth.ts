import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  type AuthSessionResult,
} from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import appConfig from 'constants/appConfig';
import { useSignInWithGoogleMutation } from 'store/services/authenticationService';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  ios: appConfig.googleIosClientId,
  android: appConfig.googleAndroidClientId,
  web: appConfig.googleWebClientId,
};

const SCOPES = ['openid', 'profile', 'email'];

const EXCHANGE_TIMEOUT_MS = 20_000;

/**
 * `expo-auth-session`'s Google provider throws while rendering if the platform's
 * client id is `undefined`. The button is hidden long before `signIn` could be
 * pressed, so this value only has to exist; it is never sent anywhere.
 */
const UNCONFIGURED_CLIENT_ID = 'google-sign-in-not-configured';

export const selectGoogleClientId = (
  os: string,
  ids: { ios?: string; android?: string; web?: string },
): string => {
  if (os === 'ios') return ids.ios ?? '';
  if (os === 'android') return ids.android ?? '';
  return ids.web ?? '';
};

export const googleClientId = selectGoogleClientId(
  Platform.OS,
  GOOGLE_CLIENT_IDS,
);
export const isGoogleAuthConfigured = Boolean(googleClientId);

/** One value for both the authorization request and the code exchange: Google
 * rejects an exchange whose client id differs from the one the code was issued
 * to, and there is nothing in the response that would say so. */
const CLIENT_ID = googleClientId || UNCONFIGURED_CLIENT_ID;

/**
 * Expo Go is one shared app under one shared package name, so Google's redirect
 * to *this* app's scheme never reaches it. No configuration fixes that: Google
 * sign-in needs a development build or the APK. Saying so is the point — left
 * alone the flow opens the account picker, returns to nothing, and reads as a
 * bug in this code rather than as the wrong kind of build.
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * The application id, which for a native Google client doubles as the only URI
 * scheme Google will redirect to: the Android package name, or the iOS bundle
 * identifier. Read from the app config rather than from `expo-application` so
 * it stays a plain string this module can quote back in an error.
 */
export const nativeApplicationId = (
  os: string = Platform.OS,
  config: {
    android?: { package?: string };
    ios?: { bundleIdentifier?: string };
    scheme?: string | string[];
  } | null = Constants.expoConfig,
): string => {
  const declared =
    os === 'ios' ? config?.ios?.bundleIdentifier : config?.android?.package;

  if (declared) return declared;

  const scheme = config?.scheme;
  return (Array.isArray(scheme) ? scheme[0] : scheme) ?? '';
};

/**
 * `<application id>:/oauthredirect` — the same URI Expo's provider builds for
 * itself, so an OAuth client already registered against it keeps working. It is
 * spelled out here because the app has to be able to name it: a redirect Google
 * does not recognise is otherwise a blank screen with nothing to go on.
 */
export const googleRedirectUri = (): string => {
  if (Platform.OS === 'web') return makeRedirectUri();

  const applicationId = nativeApplicationId();

  return applicationId
    ? makeRedirectUri({ native: `${applicationId}:/oauthredirect` })
    : makeRedirectUri({ path: 'oauthredirect' });
};

type AuthOutcome =
  | { status: 'success'; code: string }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'failed'; message: string };

/**
 * What actually came back from the browser. Backing out is not a failure and is
 * not reported as one; everything else has to say something, because a response
 * that is neither acted on nor explained is the state this screen was stuck in.
 */
export const describeAuthResponse = (
  response: AuthSessionResult,
): AuthOutcome => {
  if (response.type === 'cancel' || response.type === 'dismiss') {
    return { status: 'cancelled' };
  }

  // The browser is open and the real result is still to come; on the web that
  // is the page navigating away and back.
  if (response.type === 'opened') return { status: 'pending' };

  // iOS refuses to open a second authentication session over an open one.
  if (response.type === 'locked') {
    return {
      status: 'failed',
      message: 'Another sign-in is already open. Finish or close it first.',
    };
  }

  if (response.type === 'error') {
    return {
      status: 'failed',
      message:
        response.error?.message ||
        response.params?.error_description ||
        response.params?.error ||
        'Google refused the sign-in request.',
    };
  }

  // Every other shape is handled above; this narrows the union to the one that
  // carries params.
  if (response.type !== 'success') {
    return { status: 'failed', message: 'Google sign-in did not complete.' };
  }

  const code = response.params?.code;
  if (code) return { status: 'success', code };

  // Success with no code is Google answering a request it never accepted —
  // usually a redirect URI or a client id that does not match this platform.
  return {
    status: 'failed',
    message:
      response.params?.error_description ||
      'Google returned no authorization code.',
  };
};

const apiMessage = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null) return null;

  const { message } = data as { message?: unknown };
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
};

/**
 * Turns whatever the exchange or the API rejected with into one line someone
 * can act on. The generic "sign-in failed" is the last resort, not the default:
 * every one of these failures used to arrive as silence.
 */
export const describeSignInError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status, data } = error as { status: unknown; data?: unknown };
    const message = apiMessage(data);

    if (status === 'FETCH_ERROR') {
      return 'Could not reach the server. Check that the app points at an address this device can open.';
    }
    if (status === 'TIMEOUT_ERROR') {
      return 'The server took too long to answer. Try again.';
    }
    if (status === 503) {
      return message ?? 'Google sign-in is not configured on the server.';
    }
    if (status === 401) {
      return (
        message ??
        'The server would not accept this Google account. Its client id may be missing from GOOGLE_NATIVE_CLIENT_IDS.'
      );
    }
    if (typeof status === 'number') {
      return message ?? `The server answered ${status}.`;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return 'Google sign-in failed.';
};

const withTimeout = <T>(work: Promise<T>, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(message)),
      EXCHANGE_TIMEOUT_MS,
    );

    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });

export interface GoogleAuthState {
  isAvailable: boolean;
  isBusy: boolean;
  error: Error | null;
  /** Why the button cannot be used, when that is worth telling the user. */
  unavailableReason: string | null;
  signIn: () => Promise<void>;
}

export function useGoogleAuth(onSuccess?: () => void): GoogleAuthState {
  const redirectUri = useMemo(googleRedirectUri, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // The platform's id is picked here rather than by the provider, so a
    // platform with none configured hides the button instead of throwing
    // mid-render.
    clientId: CLIENT_ID,
    redirectUri,
    scopes: SCOPES,
    responseType: ResponseType.Code,
    usePKCE: true,
    // The provider's own code exchange has no failure path: when Google refuses
    // the code it never resolves, the response stays null, and the button spins
    // for as long as the screen is open. Ours is below, with a timeout.
    shouldAutoExchangeCode: false,
    // Always offer the account picker. Without it a second sign-in silently
    // reuses the first account, which cannot then be changed from inside the app.
    selectAccount: true,
  });
  const [signInWithGoogle, { isLoading }] = useSignInWithGoogleMutation();
  const [isPrompting, setIsPrompting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const exchanged = useRef<string | null>(null);

  // Held in refs so neither one re-runs the exchange below: a second run would
  // abandon the first while its code is already spent.
  const requestRef = useRef(request);
  const onSuccessRef = useRef(onSuccess);
  const isMounted = useRef(true);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fail = useCallback((message: string, cause?: unknown) => {
    if (cause !== undefined) {
      console.warn(`[google-sign-in] ${message}`, cause);
    }
    if (isMounted.current) setError(new Error(message));
  }, []);

  useEffect(() => {
    if (!response) return;

    const outcome = describeAuthResponse(response);

    // Still in the browser: leave the button busy and wait for the real result.
    if (outcome.status === 'pending') return;

    if (outcome.status !== 'success') {
      setIsPrompting(false);
      if (outcome.status === 'failed') fail(outcome.message, response);
      return;
    }

    // A re-render must not spend the same code twice: Google issues it once.
    if (exchanged.current === outcome.code) return;
    exchanged.current = outcome.code;

    setError(null);

    const finish = async () => {
      const codeVerifier = requestRef.current?.codeVerifier;

      const tokens = await withTimeout(
        exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: outcome.code,
            redirectUri,
            extraParams: codeVerifier ? { code_verifier: codeVerifier } : {},
          },
          Google.discovery,
        ),
        'Google took too long to answer. Check the connection and try again.',
      );

      if (!tokens.idToken) {
        throw new Error(
          'Google issued no id token. The client id in use may not be the one for this platform.',
        );
      }

      await signInWithGoogle({ idToken: tokens.idToken }).unwrap();
    };

    finish()
      .then(() => onSuccessRef.current?.())
      .catch((cause) => {
        // Let the user try again rather than leaving a spent code in the way.
        exchanged.current = null;
        fail(describeSignInError(cause), cause);
      })
      .finally(() => {
        if (isMounted.current) setIsPrompting(false);
      });
  }, [fail, redirectUri, response, signInWithGoogle]);

  const signIn = useCallback(async () => {
    if (!isGoogleAuthConfigured) {
      fail(
        `Google sign-in is not configured for ${Platform.OS}. Set the client id for this platform in .env and rebuild.`,
      );
      return;
    }

    if (isExpoGo) {
      fail(
        'Google sign-in does not work in Expo Go. Use a development build (npx expo run:android) or the release APK.',
      );
      return;
    }

    if (!request) {
      fail('Google sign-in is still starting up. Try again in a moment.');
      return;
    }

    setError(null);
    setIsPrompting(true);

    try {
      // The result is handled by the effect above; only a failure to open the
      // browser at all is rejected here.
      await promptAsync();
    } catch (cause) {
      if (isMounted.current) setIsPrompting(false);
      fail(describeSignInError(cause), cause);
    }
  }, [fail, promptAsync, request]);

  return {
    isAvailable: isGoogleAuthConfigured && !isExpoGo,
    isBusy: isPrompting || isLoading,
    error,
    unavailableReason:
      isGoogleAuthConfigured && isExpoGo
        ? 'Google sign-in needs a development build — Expo Go cannot receive Google’s redirect.'
        : null,
    signIn,
  };
}

export default useGoogleAuth;
