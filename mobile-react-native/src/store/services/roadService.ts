import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { WaypointWithAddressAndId } from 'types/map-screen-type';

export const roadService = createApi({
  reducerPath: 'roadService',
  baseQuery: baseQuery(),
  tagTypes: ['Road'],
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
    getOwnRoads: builder.query<any, { accessToken: string }>({
      query: ({ accessToken }) => {
        return {
          url: `/road/own-roads`,
          method: 'POST',
          body: {},
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

    getRoadById: builder.query<
      WaypointWithAddressAndId,
      { accessToken: string; routeId: string }
    >({
      query: (args: any) => {
        return {
          url: `/road/${args.routeId}`,
          method: 'GET',
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
        return response.data;
      },
    }),
    deleteRoadById: builder.mutation<
      any,
      { accessToken: string; roadId: string }
    >({
      query: (args: any) => {
        return {
          url: `/road/delete/${args.roadId}`,
          method: 'POST',
          body: {},
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res) => {
        return transformApiResponse(res);
      },
      transformErrorResponse: (error: any) => error,
    }),
    updateRoadById: builder.mutation<
      any,
      {
        accessToken: string;
        routeId: string;
        waypoints: any;
        title: string;
        description: string;
      }
    >({
      query: (args: any) => {
        return {
          url: `/road/update/${args.routeId}`,
          method: 'PUT',
          body: {
            waypoints: args.waypoints,
            title: args.title,
            description: args.description,
          },
          param: {
            id: args.routeId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),

    addWaypoint: builder.mutation<
      any,
      {
        accessToken: string;
        routeId: string;
        waypoint: {
          latitude: number;
          longitude: number;
          address: {
            country: any;
            province: any;
            district: any;
            address: any;
          };
          order: number;
        };
      }
    >({
      query: (args: any) => {
        return {
          url: `/road/add-waypoint/${args.routeId}`,
          method: 'POST',
          body: {
            longitude: args.waypoint.longitude,
            latitude: args.waypoint.latitude,
            order: args.waypoint.order,
            address: {
              country: args.waypoint.address.country,
              province: args.waypoint.address.province,
              district: args.waypoint.address.district,
              address: args.waypoint.address.address,
            },
          },
          param: {
            id: args.routeId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
    deleteWaypointByRoadId: builder.mutation<
      any,
      { accessToken: string; routeId: string; waypointId: string }
    >({
      query: (args: any) => {
        return {
          url: `/road/delete-waypoint/${args.routeId}`,
          method: 'DELETE',
          body: {
            waypointId: args.waypointId,
          },
          param: {
            id: args.routeId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
    updateWaypointByRoadId: builder.mutation<
      any,
      {
        accessToken: string;
        routeId: string;
        waypointId: string;
        waypoint: {
          latitude: number;
          longitude: number;
          address: {
            country: any;
            province: any;
            district: any;
            address: any;
          };
          order: number;
        };
      }
    >({
      query: (args: any) => {
        return {
          url: `/road/update-waypoint/${args.routeId}`,
          method: 'PUT',
          body: {
            waypointId: args.waypointId,
            longitude: args.waypoint.longitude,
            latitude: args.waypoint.latitude,
            order: args.waypoint.order,
            address: {
              country: args.waypoint.address.country,
              province: args.waypoint.address.province,
              district: args.waypoint.address.district,
              address: args.waypoint.address.address,
            },
          },
          param: {
            id: args.routeId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res) => {
        return transformApiResponse(res.data);
      },
      transformErrorResponse: (error: any) => error,
    }),
  }),
});

export const {
  useGetOwnRoadsQuery,
  useGetRoadByIdQuery,
  useDeleteRoadByIdMutation,
  useUpdateRoadByIdMutation,
  useAddWaypointMutation,
  useDeleteWaypointByRoadIdMutation,
  useUpdateWaypointByRoadIdMutation,
} = roadService;
