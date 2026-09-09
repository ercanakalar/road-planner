import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { COLLECTION_PAGE_SIZE, DISCOVER_PAGE_SIZE } from 'constants/pagination';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { UNSHAPED_STOP } from 'utils/stopShape';
import { ApiResponse } from 'types/store/bases';
import { StopWithAddress } from 'types/map-screen-type';
import {
  AddStopArgs,
  AddStopResponse,
  CreateRouteArgs,
  CreateRouteResponse,
  DeleteRouteByIdArgs,
  DeleteRouteByIdResponse,
  DeleteStopByRouteIdArgs,
  DeleteStopByRouteIdResponse,
  CloneRouteArgs,
  CloneRouteResponse,
  GetDiscoverRoutesArgs,
  GetDiscoverRoutesResponse,
  GetOwnRoutesArgs,
  GetOwnRoutesResponse,
  GetRouteByIdArgs,
  GetRouteByIdResponse,
  GetRouteTerrainArgs,
  GetRouteTerrainResponse,
  GetSharedRouteArgs,
  GetSharedRouteResponse,
  ShareRouteArgs,
  ShareRouteResponse,
  GetStopByIdArgs,
  GetStopByIdResponse,
  ReorderStopsArgs,
  ReorderStopsResponse,
  UpdateRouteByIdArgs,
  UpdateRouteByIdResponse,
  UpdateStopByStopIdArgs,
  UpdateStopByStopIdResponse,
} from 'types/store/services/routeService-type';

const TEMP_STOP_ID = 'temp-stop-id';

/** Shown on an optimistically added stop until the server names it. */
const PENDING_ADDRESS = 'Locating…';

const withSequentialOrder = (
  stops: StopWithAddress[],
): StopWithAddress[] =>
  stops.map((stop, index) =>
    stop.order === index + 1 ? stop : { ...stop, order: index + 1 },
  );

const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * The app calls these things routes. The API still calls them roads, and its
 * paths and payload keys are a contract this client does not get to rewrite —
 * so `/road/...`, `own-roads` and the `roadId` body key below stay as the
 * server names them, and the translation happens here rather than leaking the
 * older word back into the screens.
 */
export const routeService = createApi({
  reducerPath: 'routeService',
  baseQuery: baseQuery(),
  tagTypes: ['Route', 'Stop'],
  keepUnusedDataFor: 300,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  endpoints: (builder) => ({
    getOwnRoutes: builder.query<GetOwnRoutesResponse, GetOwnRoutesArgs>({
      query: () => ({
        url: '/road/own-roads',
        method: 'POST',
        body: {},
        params: { limit: COLLECTION_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<GetOwnRoutesResponse>) =>
        transformApiResponse(res) ?? [],
      providesTags: (result) => [
        { type: 'Route' as const, id: 'LIST' },
        ...(result ?? []).map((route) => ({
          type: 'Route' as const,
          id: route.id,
        })),
      ],
    }),

    getDiscoverRoutes: builder.query<
      GetDiscoverRoutesResponse,
      GetDiscoverRoutesArgs
    >({
      query: () => ({
        url: '/road/discover',
        method: 'GET',
        params: { limit: DISCOVER_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<GetDiscoverRoutesResponse>) =>
        transformApiResponse(res) ?? [],
      providesTags: [{ type: 'Route' as const, id: 'DISCOVER' }],
    }),

    cloneRoute: builder.mutation<CloneRouteResponse, CloneRouteArgs>({
      query: ({ routeId }) => ({
        url: `/road/clone/${routeId}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<CloneRouteResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),

    shareRoute: builder.query<ShareRouteResponse, ShareRouteArgs>({
      query: ({ routeId }) => ({
        url: `/road/share/${routeId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<ShareRouteResponse>) =>
        transformApiResponse(res),
    }),

    getSharedRoute: builder.query<GetSharedRouteResponse, GetSharedRouteArgs>({
      query: ({ token }) => ({
        url: `/road/share/${encodeURIComponent(token)}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<GetSharedRouteResponse>) =>
        transformApiResponse(res),
    }),

    getRouteById: builder.query<GetRouteByIdResponse, GetRouteByIdArgs>({
      query: ({ routeId }) => ({
        url: `/road/${routeId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetRouteByIdResponse>) =>
        transformApiResponse(res),
      providesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
      ],
    }),

    getRouteTerrain: builder.query<GetRouteTerrainResponse, GetRouteTerrainArgs>({
      query: ({ routeId }) => ({
        url: `/road/${routeId}/terrain`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetRouteTerrainResponse>) =>
        transformApiResponse(res) ?? [],
      // Read off the stops' positions, so it is stale the moment one moves.
      providesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
      ],
    }),

    getStopById: builder.query<
      GetStopByIdResponse,
      GetStopByIdArgs
    >({
      query: ({ stopId }) => ({
        url: `/road/stop/${stopId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetStopByIdResponse>) =>
        transformApiResponse(res),
      providesTags: (_result, _error, { stopId }) => [
        { type: 'Stop', id: stopId },
      ],
    }),

    deleteRouteById: builder.mutation<
      DeleteRouteByIdResponse,
      DeleteRouteByIdArgs
    >({
      query: ({ routeId }) => ({
        url: `/road/delete/${routeId}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<DeleteRouteByIdResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: 'LIST' },
        { type: 'Route', id: 'DISCOVER' },
        { type: 'Route', id: routeId },
      ],
      async onQueryStarted({ routeId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          routeService.util.updateQueryData('getOwnRoutes', undefined, (draft) =>
            draft.filter((route) => route.id !== routeId),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    createRoute: builder.mutation<CreateRouteResponse, CreateRouteArgs>({
      query: ({ title, description, stops }) => ({
        url: '/road/create',
        method: 'POST',
        body: { title, description: description ?? '', stops },
      }),
      transformResponse: (res: ApiResponse<CreateRouteResponse>) =>
        transformApiResponse(res),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),

    updateRouteById: builder.mutation<
      UpdateRouteByIdResponse,
      UpdateRouteByIdArgs
    >({
      query: ({ routeId, title, description, isPublic, stops }) => ({
        url: `/road/update/${routeId}`,
        method: 'PUT',
        body: {
          title,
          description,
          stops,
          ...(isPublic === undefined ? {} : { isPublic }),
        },
      }),
      transformResponse: (res: ApiResponse<UpdateRouteByIdResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: 'LIST' },
        { type: 'Route', id: routeId },
      ],
    }),

    addStop: builder.mutation<AddStopResponse, AddStopArgs>({
      query: ({ routeId, stop }) => ({
        url: `/road/add-stop/${routeId}`,
        method: 'POST',
        body: {
          latitude: stop.latitude,
          longitude: stop.longitude,
          order: stop.order,
          ...(stop.address ? { address: stop.address } : {}),
        },
      }),
      transformResponse: (res: ApiResponse<AddStopResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
        { type: 'Route', id: 'LIST' },
      ],
      async onQueryStarted({ routeId, stop }, { dispatch, queryFulfilled }) {
        const now = new Date().toISOString();
        const patch = dispatch(
          routeService.util.updateQueryData(
            'getRouteById',
            { routeId },
            (draft) => {
              draft.stops.push({
                // The server works slope and bend out from a stop's
                // neighbours, so the optimistic row shows neither until it
                // answers rather than guessing at both.
                ...UNSHAPED_STOP,
                elevation: null,
                id: TEMP_STOP_ID,
                routeId,
                latitude: stop.latitude,
                longitude: stop.longitude,
                order: draft.stops.length + 1,
                description: stop.description,
                favoriteStops: [],
                createdAt: now,
                updatedAt: now,
                address: stop.address ?? PENDING_ADDRESS,
              });
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    deleteStopById: builder.mutation<
      DeleteStopByRouteIdResponse,
      DeleteStopByRouteIdArgs
    >({
      query: ({ stopId }) => ({
        url: `/road/delete-stop/${stopId}`,
        method: 'DELETE',
        body: {},
      }),
      transformResponse: (res: ApiResponse<DeleteStopByRouteIdResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
      ],
      async onQueryStarted(
        { routeId, stopId },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          routeService.util.updateQueryData(
            'getRouteById',
            { routeId },
            (draft) => {
              draft.stops = withSequentialOrder(
                draft.stops.filter(
                  (stop) => stop.id !== stopId,
                ),
              );
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    updateStopById: builder.mutation<
      UpdateStopByStopIdResponse,
      UpdateStopByStopIdArgs
    >({
      query: ({ stopId, stop }) => ({
        url: `/road/update-stop/${stopId}`,
        method: 'PUT',
        body: {
          latitude: stop.latitude,
          longitude: stop.longitude,
          ...(stop.address ? { address: stop.address } : {}),
        },
      }),
      transformResponse: (
        res: ApiResponse<UpdateStopByStopIdResponse>,
      ) => transformApiResponse(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
      ],
      async onQueryStarted(
        { routeId, stopId, stop },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          routeService.util.updateQueryData(
            'getRouteById',
            { routeId },
            (draft) => {
              const target = draft.stops.find(
                (candidate) => candidate.id === stopId,
              );
              if (!target) return;
              target.latitude = stop.latitude;
              target.longitude = stop.longitude;
              target.address = stop.address ?? PENDING_ADDRESS;
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    reOrderStops: builder.mutation<
      ReorderStopsResponse,
      ReorderStopsArgs
    >({
      query: ({ routeId, from, to }) => ({
        url: `/road/reorder-stop/${routeId}`,
        method: 'PUT',
        body: { roadId: routeId, from, to },
      }),
      transformResponse: (res: ApiResponse<ReorderStopsResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { routeId }) => [
        { type: 'Route', id: routeId },
      ],
      async onQueryStarted({ routeId, from, to }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          routeService.util.updateQueryData(
            'getRouteById',
            { routeId },
            (draft) => {
              draft.stops = withSequentialOrder(
                moveItem(draft.stops, from, to),
              );
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetOwnRoutesQuery,
  useGetDiscoverRoutesQuery,
  useCloneRouteMutation,
  useLazyShareRouteQuery,
  useGetSharedRouteQuery,
  useGetRouteByIdQuery,
  useGetRouteTerrainQuery,
  useLazyGetRouteByIdQuery,
  useGetStopByIdQuery,
  useAddStopMutation,
  useCreateRouteMutation,
  useDeleteRouteByIdMutation,
  useUpdateRouteByIdMutation,
  useUpdateStopByIdMutation,
  useDeleteStopByIdMutation,
  useReOrderStopsMutation,
} = routeService;
