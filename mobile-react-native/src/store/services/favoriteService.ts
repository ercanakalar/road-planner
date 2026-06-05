import { EndpointDefinition } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import {
  AddFavoriteRoadArgs,
  AddFavoriteRoadResponse,
  AddFavoriteWaypointArgs,
  AddFavoriteWaypointResponse,
  GetAllFavoritesArgs,
  GetAllFavoritesResponse,
  RemoveFavoriteRoadArgs,
  RemoveFavoriteRoadResponse,
  RemoveFavoriteWaypointArgs,
  RemoveFavoriteWaypointResponse,
} from 'types/store/services/favoriteService-type';

export const favoriteService = createApi({
  reducerPath: 'favoriteService',
  baseQuery: baseQuery(),
  tagTypes: ['Favorite'],
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  endpoints: (builder) => ({
    toggleFavoriteWaypoint: builder.mutation<
      AddFavoriteWaypointResponse,
      AddFavoriteWaypointArgs
    >({
      query: (args) => ({
        url: '/favorites/toggle-waypoint',
        method: 'POST',
        body: { waypointId: args.waypointId },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.accessToken}`,
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<AddFavoriteWaypointResponse>) =>
        transformApiResponse(res),
    }),

    toggleFavoriteRoad: builder.mutation<
      AddFavoriteRoadResponse,
      AddFavoriteRoadArgs
    >({
      query: (args) => ({
        url: '/favorites/toggle-road',
        method: 'POST',
        body: { roadId: args.roadId },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.accessToken}`,
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<AddFavoriteRoadResponse>) =>
        transformApiResponse(res),
    }),

    getFavorites: builder.query<GetAllFavoritesResponse, GetAllFavoritesArgs>({
      query: (args) => ({
        url: '/favorites',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.accessToken}`,
        },
      }),
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: ApiResponse<GetAllFavoritesResponse>) =>
        transformApiResponse(res),
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useToggleFavoriteWaypointMutation,
  useToggleFavoriteRoadMutation,
} = favoriteService;
