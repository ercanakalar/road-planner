import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import {
  AddWaypointArgs,
  AddWaypointResponse,
  DeleteRoadByIdArgs,
  DeleteRoadByIdResponse,
  DeleteWaypointByRoadIdArgs,
  DeleteWaypointByRoadIdResponse,
  GetOwnRoadsArgs,
  GetOwnRoadsResponse,
  GetRoadByIdArgs,
  GetRoadByIdResponse,
  UpdateWaypointByWaypointIdArgs,
  UpdateWaypointByWaypointIdResponse,
} from 'types/store/services/roadService-type';

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
    getOwnRoads: builder.query<GetOwnRoadsResponse, GetOwnRoadsArgs>({
      query: (args: GetOwnRoadsArgs) => {
        return {
          url: `/road/own-roads`,
          method: 'POST',
          body: {},
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: GetOwnRoadsResponse) =>
        transformApiResponse(res),
    }),

    getRoadById: builder.query<GetRoadByIdResponse, GetRoadByIdArgs>({
      query: (args: GetRoadByIdArgs) => {
        return {
          url: `/road/${args.roadId}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: GetRoadByIdResponse) => {
        return transformApiResponse(res);
      },
    }),
    deleteRoadById: builder.mutation<
      DeleteRoadByIdResponse,
      DeleteRoadByIdArgs
    >({
      query: (args: DeleteRoadByIdArgs) => {
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
      transformResponse: (res: DeleteRoadByIdResponse) =>
        transformApiResponse(res),
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
        return transformApiResponse(res);
      },
    }),

    addWaypoint: builder.mutation<AddWaypointResponse, AddWaypointArgs>({
      query: (args: AddWaypointArgs) => {
        return {
          url: `/road/add-waypoint/${args.roadId}`,
          method: 'POST',
          body: {
            longitude: args.waypoint.longitude,
            latitude: args.waypoint.latitude,
            address: {
              country: args.waypoint.address.country,
              province: args.waypoint.address.province,
              district: args.waypoint.address.district,
              address: args.waypoint.address.address,
            },
          },
          param: {
            id: args.roadId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: AddWaypointResponse) =>
        transformApiResponse(res),
    }),
    deleteWaypointByRoadId: builder.mutation<
      DeleteWaypointByRoadIdResponse,
      DeleteWaypointByRoadIdArgs
    >({
      query: (args: DeleteWaypointByRoadIdArgs) => {
        return {
          url: `/road/delete-waypoint/${args.roadId}`,
          method: 'DELETE',
          body: {
            waypointId: args.waypointId,
          },
          param: {
            id: args.roadId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: DeleteWaypointByRoadIdResponse) =>
        transformApiResponse(res),
    }),
    updateWaypointById: builder.mutation<
      UpdateWaypointByWaypointIdResponse,
      UpdateWaypointByWaypointIdArgs
    >({
      query: (args: UpdateWaypointByWaypointIdArgs) => {
        return {
          url: `/road/update-waypoint/${args.waypointId}`,
          method: 'PUT',
          body: {
            longitude: args.waypoint.longitude,
            latitude: args.waypoint.latitude,
            address: {
              country: args.waypoint.address.country,
              province: args.waypoint.address.province,
              district: args.waypoint.address.district,
              address: args.waypoint.address.address,
            },
          },
          param: {
            id: args.roadId,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${args.accessToken}`,
          },
        };
      },
      transformResponse: (res: UpdateWaypointByWaypointIdResponse) =>
        transformApiResponse(res),
    }),
  }),
});

export const {
  useGetOwnRoadsQuery,
  useGetRoadByIdQuery,
  useDeleteRoadByIdMutation,
  useUpdateRoadByIdMutation,
  useAddWaypointMutation,
  useUpdateWaypointByIdMutation,
} = roadService;
