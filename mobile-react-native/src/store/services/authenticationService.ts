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

export const authenticationService = createApi({
  reducerPath: 'authenticationService',
  baseQuery: baseQuery(),
  keepUnusedDataFor: 0,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ['Authentication'],
  endpoints: (builder: {
    mutation<TResponse, TRequest>(config: {
      query: (args: TRequest) => {
        url: string;
        method: string;
        body: any;
        headers: Record<string, string>;
      };
      extraOptions?: Record<string, any>;
      transformResponse?: (response: any) => any;
    }): any;
    query<TResponse, TRequest>(config: {
      query: (args: TRequest) => {
        url: string;
        method: string;
        body: any;
        headers: Record<string, string>;
      };
      extraOptions?: Record<string, any>;
      transformResponse?: (response: any) => any;
      transformErrorResponse?: (response: any) => any;
    }): any;
  }) => ({
    signUp: builder.mutation<SignUpArgsResponse, SignUpArgs>({
      query: (args: SignUpArgs) => {
        return {
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
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: SignUpArgsResponse) => {
        return transformApiResponse(res);
      },
    }),
    signIn: builder.mutation<SignInArgsResponse, SignInArgs>({
      query: (args: SignInArgs) => {
        return {
          url: '/auth/sign-in',
          method: 'POST',
          body: {
            email: args.email,
            password: args.password,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: SignInArgsResponse) => transformApiResponse(res),
    }),
    logout: builder.mutation<void, { accessToken: string }>({
      query: (args: { accessToken: string }) => {
        return {
          url: '/auth/sign-out',
          method: 'POST',
          body: {},
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res) => transformApiResponse(res, 'logout'),
    }),
    validateRefreshToken: builder.mutation<
      ValidateRefreshTokenResponse,
      ValidateRefreshTokenArgs
    >({
      query: (args: ValidateRefreshTokenArgs) => {
        return {
          url: '/auth/refresh-token',
          method: 'POST',
          body: {
            refreshToken: args.refreshToken,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ValidateRefreshTokenResponse) =>
        transformApiResponse(res),
    }),
    googleMobileSignIn: builder.mutation<any, { code: string }>({
      query: (args) => {
        return {
          url: `/auth/google/callback?code=${args.code}`,
          method: 'GET',
          body: {},
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ValidateRefreshTokenResponse) =>
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
