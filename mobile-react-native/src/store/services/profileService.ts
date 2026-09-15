import createApi from 'store/middlewares/createApi';
import baseQuery, {
  MULTIPART,
  UPLOAD_TIMEOUT_MS,
} from 'store/bases/baseQuery';
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
import { PickedPhoto, toUploadPart } from 'utils/photoUpload';

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

    /**
     * The file itself, as multipart rather than as JSON.
     *
     * See `toUploadPart`: the part has to be a Blob-like object Expo's own
     * fetch can encode, not React Native's `{ uri, name, type }` file — that
     * one never leaves the device.
     */
    updatePhoto: builder.mutation<UserResponse, PickedPhoto>({
      query: (photo) => {
        const body = new FormData();

        body.append('photo', toUploadPart(photo));

        return {
          url: '/user/photo',
          method: 'POST',
          body,
          // Deleted again in prepareHeaders once the boundary can be generated
          // — this only says "do not default me to JSON".
          headers: { 'Content-Type': MULTIPART },
          timeout: UPLOAD_TIMEOUT_MS,
        };
      },
      // Sending the file again is not free the way replaying a GET is: a retry
      // re-uploads every byte, so two of them turn one slow minute into three
      // before anything is said. An upload reports its failure and lets the
      // person decide whether to try again.
      extraOptions: { maxRetries: 0 },
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
