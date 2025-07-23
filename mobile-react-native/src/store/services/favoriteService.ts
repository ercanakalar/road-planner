import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

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
    addFavoriteWaypoint: builder.mutation<
      any,
      { accessToken: string; waypointId: string }
    >({
      query: ({ accessToken, waypointId }) => {
        return {
          url: `/favorites/add-waypoint`,
          method: 'POST',
          body: { waypointId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },

      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
    removeFavoriteWaypoint: builder.mutation<
      any,
      { accessToken: string; favoriteId: string }
    >({
      query: ({ accessToken, favoriteId }) => {
        return {
          url: `/favorites/remove-waypoint`,
          method: 'DELETE',
          body: { favoriteId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },

      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
    addFavoriteRoad: builder.mutation<
      any,
      { accessToken: string; roadId: string }
    >({
      query: ({ accessToken, roadId }) => {
        return {
          url: `/favorites/add-road`,
          method: 'POST',
          body: { roadId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
    removeFavoriteRoad: builder.mutation<
      any,
      { accessToken: string; favoriteId: string }
    >({
      query: ({ accessToken, favoriteId }) => {
        return {
          url: `/favorites/remove-road`,
          method: 'DELETE',
          body: { favoriteId },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        };
      },
      extraOptions: {
        maxRetries: 0,
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
  }),
});

export const {
  useAddFavoriteWaypointMutation,
  useRemoveFavoriteWaypointMutation,
  useAddFavoriteRoadMutation,
  useRemoveFavoriteRoadMutation,
} = favoriteService;
