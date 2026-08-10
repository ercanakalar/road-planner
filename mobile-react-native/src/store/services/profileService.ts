import createApi from 'store/middlewares/createApi';
import baseQuery, { MULTIPART } from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';

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
  keepUnusedDataFor: 300,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,

  endpoints: (builder) => ({
    getUser: builder.query<GetUserByIdResponse, GetUserByIdArgs>({
      query: ({ userId }) => ({
        url: `/user/${userId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { userId }) => [
        { type: 'UserProfile', id: userId },
      ],
      transformResponse: (res: ApiResponse<GetUserByIdResponse>) =>
        transformApiResponse(res),
    }),

    updatePhoto: builder.mutation<UserResponse, { uri: string }>({
      query: ({ uri }) => {
        const body = new FormData();
        const extension = uri.split('.').pop()?.toLowerCase();
        const type =
          extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

        body.append('photo', {
          uri,
          name: `avatar.${extension ?? 'jpg'}`,
          type,
        } as unknown as Blob);

        return {
          url: '/user/photo',
          method: 'POST',
          body,
          headers: { 'Content-Type': MULTIPART },
        };
      },
      transformResponse: (res: ApiResponse<UserResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: (result) => [
        { type: 'UserProfile' as const, id: result?.id },
      ],
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
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'UserProfile', id },
      ],
      transformResponse: (res: ApiResponse<UserResponse>) =>
        transformApiResponseWithToast(res),
    }),
  }),
});

export const {
  useGetUserQuery,
  useUpdateUserMutation,
  useUpdatePhotoMutation,
} = profileService;
