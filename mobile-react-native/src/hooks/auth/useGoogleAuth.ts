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
import i18n from 'i18n';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
    ios: appConfig.googleIosClientId,
    android: appConfig.googleAndroidClientId,
    web: appConfig.googleWebClientId,
};

const SCOPES = ['openid', 'profile', 'email'];

const EXCHANGE_TIMEOUT_MS = 20_000;

const UNCONFIGURED_CLIENT_ID = 'google-sign-in-not-configured';

export const selectGoogleClientId = (
    os: string,
    ids: { ios?: string; android?: string; web?: string },
): string => {
    if (os === 'ios') return ids.ios ?? '';
    if (os === 'android') return ids.android ?? '';
    return ids.web ?? '';
};

const googleClientId = selectGoogleClientId(Platform.OS, GOOGLE_CLIENT_IDS);
const isGoogleAuthConfigured = Boolean(googleClientId);

const CLIENT_ID = googleClientId || UNCONFIGURED_CLIENT_ID;

const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

const googleRedirectUri = (): string => {
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

export const describeAuthResponse = (
    response: AuthSessionResult,
): AuthOutcome => {
    if (response.type === 'cancel' || response.type === 'dismiss') {
        return { status: 'cancelled' };
    }

    if (response.type === 'opened') return { status: 'pending' };

    if (response.type === 'locked') {
        return {
            status: 'failed',
            message: i18n.t('toast.signInAlreadyOpen'),
        };
    }

    if (response.type === 'error') {
        return {
            status: 'failed',
            message:
                response.error?.message ||
                response.params?.error_description ||
                response.params?.error ||
                i18n.t('toast.googleRefused'),
        };
    }

    if (response.type !== 'success') {
        return {
            status: 'failed',
            message: i18n.t('toast.googleSignInIncomplete'),
        };
    }

    const code = response.params?.code;
    if (code) return { status: 'success', code };

    return {
        status: 'failed',
        message:
            response.params?.error_description || i18n.t('errors.googleNoCode'),
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

export const describeSignInError = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const { status, data } = error as { status: unknown; data?: unknown };
        const message = apiMessage(data);

        if (status === 'FETCH_ERROR') {
            return i18n.t('errors.googleUnreachable');
        }
        if (status === 'TIMEOUT_ERROR') {
            return i18n.t('errors.googleTimedOut');
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
            return message ?? i18n.t('errors.serverAnswered', { status });
        }
    }

    if (error instanceof Error && error.message) return error.message;

    return i18n.t('errors.googleFailed');
};

const withTimeout = <T>(work: Promise<T>, message: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(message)),
            EXCHANGE_TIMEOUT_MS,
        );

        work.then(resolve, reject).finally(() => clearTimeout(timer));
    });

interface GoogleAuthState {
    isAvailable: boolean;
    isBusy: boolean;
    error: Error | null;
    unavailableReason: string | null;
    signIn: () => Promise<void>;
}

export function useGoogleAuth(onSuccess?: () => void): GoogleAuthState {
    const redirectUri = useMemo(googleRedirectUri, []);

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: CLIENT_ID,
        redirectUri,
        scopes: SCOPES,
        responseType: ResponseType.Code,
        usePKCE: true,
        shouldAutoExchangeCode: false,
        selectAccount: true,
    });
    const [signInWithGoogle, { isLoading }] = useSignInWithGoogleMutation();
    const [isPrompting, setIsPrompting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const exchanged = useRef<string | null>(null);

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

        if (outcome.status === 'pending') return;

        if (outcome.status !== 'success') {
            setIsPrompting(false);
            if (outcome.status === 'failed') fail(outcome.message, response);
            return;
        }

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
                        extraParams: codeVerifier
                            ? { code_verifier: codeVerifier }
                            : {},
                    },
                    Google.discovery,
                ),
                i18n.t('errors.googleSlow'),
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
            fail(i18n.t('errors.googleStillStarting'));
            return;
        }

        setError(null);
        setIsPrompting(true);

        try {
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
