import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import {
  AppStatistics,
  MyStatistics,
} from 'types/store/services/statisticsService-type';

export const statisticsService = createApi({
  reducerPath: 'statisticsService',
  baseQuery: baseQuery(),
  keepUnusedDataFor: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getMyStatistics: builder.query<MyStatistics, void>({
      query: () => ({ url: '/statistics/me', method: 'GET' }),
      transformResponse: (res: ApiResponse<MyStatistics>) =>
        transformApiResponse(res),
    }),

    // For the people with the dashboard permission; anyone else is refused.
    getAppStatistics: builder.query<AppStatistics, number>({
      query: (days) => ({
        url: '/statistics/overview',
        method: 'GET',
        params: { days },
      }),
      transformResponse: (res: ApiResponse<AppStatistics>) =>
        transformApiResponse(res),
    }),
  }),
});

export const { useGetMyStatisticsQuery, useGetAppStatisticsQuery } =
  statisticsService;
