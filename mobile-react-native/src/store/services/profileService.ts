import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';

interface ApiResponse {
  Response: string;
  [key: string]: any;
}

export const profileService = createApi({
  reducerPath: 'profileService',
  baseQuery: baseQuery(),
  tagTypes: ['Profile'],
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  endpoints: (builder) => ({
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
      providesTags: ['Profile'],
      transformResponse: (res: ApiResponse) => {
        return res.data;
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
      invalidatesTags: ['Profile'],
      transformResponse: (res: ApiResponse) => {
        return res.data;
      },
      transformErrorResponse: (error: any) => error,
    }),
  }),
});

export const { useGetUserQuery, useUpdateUserMutation } = profileService;
