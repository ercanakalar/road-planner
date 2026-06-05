import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

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
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
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
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<SignUpArgsResponse>) =>
        transformApiResponse(res),
    }),

    signIn: builder.mutation<SignInArgsResponse, SignInArgs>({
      query: (args) => ({
        url: '/auth/sign-in',
        method: 'POST',
        body: {
          email: args.email,
          password: args.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<SignInArgsResponse>) =>
        transformApiResponse(res),
    }),

    logout: builder.mutation<void, { accessToken: string }>({
      query: ({ accessToken }) => ({
        url: '/auth/sign-out',
        method: 'POST',
        body: {},
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<void>) =>
        transformApiResponse(res, 'logout'),
    }),

    validateRefreshToken: builder.mutation<
      ValidateRefreshTokenResponse,
      ValidateRefreshTokenArgs
    >({
      query: (args) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: {
          refreshToken: args.refreshToken,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.accessToken}`,
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<ValidateRefreshTokenResponse>) =>
        transformApiResponse(res),
    }),

    googleMobileSignIn: builder.mutation<
      ValidateRefreshTokenResponse,
      { code: string }
    >({
      query: ({ code }) => ({
        url: `/auth/google/callback?code=${code}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<ValidateRefreshTokenResponse>) =>
        transformApiResponse(res),
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
