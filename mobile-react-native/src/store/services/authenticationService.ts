import baseQuery from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';

import createApi from '../middlewares/createApi';

import {
  SignInArgs,
  SignInArgsResponse,
  SignUpArgs,
  SignUpArgsResponse,
  ValidateRefreshTokenArgs,
  ValidateRefreshTokenResponse,
} from '../../types/store/services/authenticationService-type';
import { ApiResponse } from 'types/store/bases';

export const authenticationService = createApi({
  reducerPath: 'authenticationService',
  baseQuery: baseQuery(),
  keepUnusedDataFor: 0,
  refetchOnReconnect: true,
  tagTypes: ['Authentication'],
  endpoints: (builder) => ({
    signUp: builder.mutation<SignUpArgsResponse, SignUpArgs>({
      query: (args) => ({
        url: '/auth/sign-up',
        method: 'POST',
        body: {
          email: args.email,
          password: args.password,
          confirmPassword: args.confirmPassword,
        },
      }),
      extraOptions: { maxRetries: 0 },
      transformResponse: (res: ApiResponse<SignUpArgsResponse>) =>
        transformApiResponseWithToast(res),
    }),

    signIn: builder.mutation<SignInArgsResponse, SignInArgs>({
      query: (args) => ({
        url: '/auth/sign-in',
        method: 'POST',
        body: { email: args.email, password: args.password },
      }),
      extraOptions: { maxRetries: 0 },
      transformResponse: (res: ApiResponse<SignInArgsResponse>) =>
        transformApiResponseWithToast(res),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/sign-out',
        method: 'POST',
        body: {},
      }),
      extraOptions: { maxRetries: 0 },
      transformResponse: (res: ApiResponse<void>) => transformApiResponse(res),
    }),

    validateRefreshToken: builder.mutation<
      ValidateRefreshTokenResponse,
      ValidateRefreshTokenArgs
    >({
      query: (args) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refreshToken: args.refreshToken },
      }),
      extraOptions: { maxRetries: 0 },
      transformResponse: (res: ApiResponse<ValidateRefreshTokenResponse>) =>
        transformApiResponse(res),
    }),

    googleMobileSignIn: builder.mutation<
      ValidateRefreshTokenResponse,
      { code: string }
    >({
      query: ({ code }) => ({
        url: `/auth/google/callback?code=${encodeURIComponent(code)}`,
        method: 'GET',
      }),
      extraOptions: { maxRetries: 0 },
      transformResponse: (res: ApiResponse<ValidateRefreshTokenResponse>) =>
        transformApiResponseWithToast(res),
    }),
  }),
});

export const {
  useSignUpMutation,
  useSignInMutation,
  useValidateRefreshTokenMutation,
  useLogoutMutation,
  useGoogleMobileSignInMutation,
} = authenticationService;
