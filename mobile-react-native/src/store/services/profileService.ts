import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

export const profileService = createApi({
  reducerPath: 'profileService',
  baseQuery: baseQuery(),
  tagTypes: ['Profile'],
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
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
      transformErrorResponse?: (response: any) => any;
    }): any;
    query<TResponse, TRequest>(config: {
      query: (args: TRequest) => {
        url: string;
        method: string;
        body?: any;
        headers: Record<string, string>;
      };
      extraOptions?: Record<string, any>;
      transformResponse?: (response: any) => any;
      transformErrorResponse?: (response: any) => any;
    }): any;
  }) => ({
    getUser: builder.query<any, any>({
      query: (args: any) => {
        return {
          url: `/user/${args.userId}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.token}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
    }),
    updateUser: builder.mutation<any, any>({
      query: (args: any) => {
        return {
          url: `/user/update`,
          method: 'POST',
          body: args.profile,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res) => {
        return transformApiResponse(res);
      },
      transformErrorResponse: (error: any) => error,
    }),
  }),
});

export const { useGetUserQuery, useUpdateUserMutation } = profileService;
