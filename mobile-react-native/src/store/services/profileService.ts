import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { UserArgs, UserResponse } from 'types/store/services/userService-type';
import {
  GetUserByIdArgs,
  GetUserByIdResponse,
} from 'types/store/services/userService-type';

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
    }): any;
    query<TResponse, TRequest>(config: {
      query: (args: TRequest) => {
        url: string;
        method: string;
        body: any;
        headers: Record<string, string>;
      };
      extraOptions?: Record<string, any>;
      transformResponse?: (response: TResponse) => any;
      transformErrorResponse?: (response: any) => any;
    }): any;
  }) => ({
    getUser: builder.query<GetUserByIdResponse, GetUserByIdArgs>({
      query: (args: GetUserByIdArgs) => {
        return {
          url: `/user/${args.userId}`,
          method: 'GET',
          body: undefined,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: GetUserByIdResponse) =>
        transformApiResponse(res),
    }),
    updateUser: builder.mutation<UserResponse, UserArgs>({
      query: (args: UserArgs) => {
        return {
          url: `/user/update`,
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
        };
      },
      transformResponse: (res: UserResponse) => transformApiResponse(res),
    }),
  }),
});

export const { useGetUserQuery, useUpdateUserMutation } = profileService;
