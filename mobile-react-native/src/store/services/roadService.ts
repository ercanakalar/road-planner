import { createApi } from '@reduxjs/toolkit/query/react';

import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';

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
        getOwnRoads: builder.mutation<any, { accessToken: string }>({
            query: (args: any) => {
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
            extraOptions: {
                maxRetries: 0,
            },
        }),
        getRoadById: builder.query<any, { accessToken: string, routeId: string }>({
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
            transformResponse(response) {
                return response.data
            },
        }),
    }),
});

export const { useGetOwnRoadsMutation, useGetRoadByIdQuery } = roadService;
