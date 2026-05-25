import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import {
  AddFavoriteRoadArgs,
  AddFavoriteRoadResponse,
  AddFavoriteWaypointArgs,
  AddFavoriteWaypointResponse,
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
    toggleFavoriteWaypoint: builder.mutation<
      AddFavoriteWaypointResponse,
      AddFavoriteWaypointArgs
    >({
      query: (args: AddFavoriteWaypointArgs) => {
        return {
          url: `/favorites/toggle-waypoint`,
          method: 'POST',
          body: { waypointId: args.waypointId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },

      transformResponse: (res: AddFavoriteWaypointResponse) =>
        transformApiResponse(res),
    }),
    toggleFavoriteRoad: builder.mutation<
      AddFavoriteRoadResponse,
      AddFavoriteRoadArgs
    >({
      query: (args: AddFavoriteRoadArgs) => {
        return {
          url: `/favorites/toggle-road`,
          method: 'POST',
          body: { roadId: args.roadId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: AddFavoriteRoadResponse) => {
        return transformApiResponse(res);
      },
    }),
    getFavorites: builder.query<
      GetAllFavoritesResponse,
      { accessToken: string }
    >({
      query: ({ accessToken }) => {
        return {
          url: `/favorites`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res: GetAllFavoritesResponse) =>
        transformApiResponse(res),
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useToggleFavoriteWaypointMutation,
  useToggleFavoriteRoadMutation,
} = favoriteService;
