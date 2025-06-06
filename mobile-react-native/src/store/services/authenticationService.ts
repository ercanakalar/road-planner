import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

import createApi from '../middlewares/createApi';

import localStorageService from 'services/localStorageService';
import {
  SignInArgs,
  SignUpArgs,
  ValidateRefreshTokenArgs,
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
    signUp: builder.mutation<any, SignUpArgs>({
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
      transformResponse: transformApiResponse,
    }),
    signIn: builder.mutation<any, SignInArgs>({
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
      transformResponse: (response: any) => {
        if (!response || !response.accessToken) {
          throw new Error('Invalid sign-in response');
        }
        return response;
      },
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
      transformResponse: (response: any) => {
        localStorageService.removeItem('accessToken');
        localStorageService.removeItem('refreshToken');
        return response;
      },
    }),
    validateRefreshToken: builder.mutation<any, ValidateRefreshTokenArgs>({
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
      transformResponse: (response: any) => {
        if (!response || !response.accessToken) {
          throw new Error('Invalid sign-in response');
        }
        return response;
      },
    }),
  }),
});

export const {
  useSignUpMutation,
  useSignInMutation,
  useValidateRefreshTokenMutation,
  useLogoutMutation,
} = authenticationService;

export default authenticationService;
