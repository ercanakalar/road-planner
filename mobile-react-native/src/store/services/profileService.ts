import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

import {
  UserArgs,
  UserResponse,
  GetUserByIdArgs,
  GetUserByIdResponse,
} from 'types/store/services/userService-type';
import { ApiResponse } from 'types/store/bases';

export const profileService = createApi({
  reducerPath: 'profileService',
  baseQuery: baseQuery(),
  tagTypes: ['UserProfile'],
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  endpoints: (builder) => ({
    getUser: builder.query<GetUserByIdResponse, GetUserByIdArgs>({
      query: ({ userId, accessToken }) => ({
        url: `/user/${userId}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }),

      providesTags: ['UserProfile'],

      transformResponse: (res: ApiResponse<GetUserByIdResponse>) =>
        transformApiResponse(res),
    }),

    updateUser: builder.mutation<UserResponse, UserArgs>({
      query: (args) => ({
        url: '/user/update',
        method: 'POST',
        body: {
          id: args.id,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          photo: args.photo,
          nickName: args.nickName,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.accessToken}`,
        },
      }),

      invalidatesTags: ['UserProfile'],

      transformResponse: (res: ApiResponse<UserResponse>) =>
        transformApiResponse(res),
    }),
  }),
});

export const { useGetUserQuery, useUpdateUserMutation } = profileService;
