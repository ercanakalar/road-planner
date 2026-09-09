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
  CreateRoadArgs,
  CreateRoadResponse,
  DeleteRoadByIdArgs,
  DeleteRoadByIdResponse,
  DeleteStopByRoadIdArgs,
  DeleteStopByRoadIdResponse,
  CloneRoadArgs,
  CloneRoadResponse,
  GetDiscoverRoadsArgs,
  GetDiscoverRoadsResponse,
  GetOwnRoadsArgs,
  GetOwnRoadsResponse,
  GetRoadByIdArgs,
  GetRoadByIdResponse,
  GetRoadTerrainArgs,
  GetRoadTerrainResponse,
  GetSharedRoadArgs,
  GetSharedRoadResponse,
  ShareRoadArgs,
  ShareRoadResponse,
  GetStopByIdArgs,
  GetStopByIdResponse,
  ReorderStopsArgs,
  ReorderStopsResponse,
  UpdateRoadByIdArgs,
  UpdateRoadByIdResponse,
  UpdateStopByStopIdArgs,
  UpdateStopByStopIdResponse,
} from 'types/store/services/roadService-type';

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

export const roadService = createApi({
  reducerPath: 'roadService',
  baseQuery: baseQuery(),
  tagTypes: ['Road', 'Stop'],
  keepUnusedDataFor: 300,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  endpoints: (builder) => ({
    getOwnRoads: builder.query<GetOwnRoadsResponse, GetOwnRoadsArgs>({
      query: () => ({
        url: '/road/own-roads',
        method: 'POST',
        body: {},
        params: { limit: COLLECTION_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<GetOwnRoadsResponse>) =>
        transformApiResponse(res) ?? [],
      providesTags: (result) => [
        { type: 'Road' as const, id: 'LIST' },
        ...(result ?? []).map((road) => ({
          type: 'Road' as const,
          id: road.id,
        })),
      ],
    }),

    getDiscoverRoads: builder.query<
      GetDiscoverRoadsResponse,
      GetDiscoverRoadsArgs
    >({
      query: () => ({
        url: '/road/discover',
        method: 'GET',
        params: { limit: DISCOVER_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<GetDiscoverRoadsResponse>) =>
        transformApiResponse(res) ?? [],
      providesTags: [{ type: 'Road' as const, id: 'DISCOVER' }],
    }),

    cloneRoad: builder.mutation<CloneRoadResponse, CloneRoadArgs>({
      query: ({ roadId }) => ({
        url: `/road/clone/${roadId}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<CloneRoadResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Road', id: 'LIST' }],
    }),

    shareRoad: builder.query<ShareRoadResponse, ShareRoadArgs>({
      query: ({ roadId }) => ({
        url: `/road/share/${roadId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<ShareRoadResponse>) =>
        transformApiResponse(res),
    }),

    getSharedRoad: builder.query<GetSharedRoadResponse, GetSharedRoadArgs>({
      query: ({ token }) => ({
        url: `/road/share/${encodeURIComponent(token)}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<GetSharedRoadResponse>) =>
        transformApiResponse(res),
    }),

    getRoadById: builder.query<GetRoadByIdResponse, GetRoadByIdArgs>({
      query: ({ roadId }) => ({
        url: `/road/${roadId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetRoadByIdResponse>) =>
        transformApiResponse(res),
      providesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
    }),

    getRoadTerrain: builder.query<GetRoadTerrainResponse, GetRoadTerrainArgs>({
      query: ({ roadId }) => ({
        url: `/road/${roadId}/terrain`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetRoadTerrainResponse>) =>
        transformApiResponse(res) ?? [],
      // Read off the stops' positions, so it is stale the moment one moves.
      providesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
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

    deleteRoadById: builder.mutation<
      DeleteRoadByIdResponse,
      DeleteRoadByIdArgs
    >({
      query: ({ roadId }) => ({
        url: `/road/delete/${roadId}`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (res: ApiResponse<DeleteRoadByIdResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: 'LIST' },
        { type: 'Road', id: 'DISCOVER' },
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted({ roadId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          roadService.util.updateQueryData('getOwnRoads', undefined, (draft) =>
            draft.filter((road) => road.id !== roadId),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    createRoad: builder.mutation<CreateRoadResponse, CreateRoadArgs>({
      query: ({ title, description, stops }) => ({
        url: '/road/create',
        method: 'POST',
        body: { title, description: description ?? '', stops },
      }),
      transformResponse: (res: ApiResponse<CreateRoadResponse>) =>
        transformApiResponse(res),
      invalidatesTags: [{ type: 'Road', id: 'LIST' }],
    }),

    updateRoadById: builder.mutation<
      UpdateRoadByIdResponse,
      UpdateRoadByIdArgs
    >({
      query: ({ roadId, title, description, isPublic, stops }) => ({
        url: `/road/update/${roadId}`,
        method: 'PUT',
        body: {
          title,
          description,
          stops,
          ...(isPublic === undefined ? {} : { isPublic }),
        },
      }),
      transformResponse: (res: ApiResponse<UpdateRoadByIdResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: 'LIST' },
        { type: 'Road', id: roadId },
      ],
    }),

    addStop: builder.mutation<AddStopResponse, AddStopArgs>({
      query: ({ roadId, stop }) => ({
        url: `/road/add-stop/${roadId}`,
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
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
        { type: 'Road', id: 'LIST' },
      ],
      async onQueryStarted({ roadId, stop }, { dispatch, queryFulfilled }) {
        const now = new Date().toISOString();
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
            (draft) => {
              draft.stops.push({
                // The server works slope and bend out from a stop's
                // neighbours, so the optimistic row shows neither until it
                // answers rather than guessing at both.
                ...UNSHAPED_STOP,
                elevation: null,
                id: TEMP_STOP_ID,
                roadId,
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
      DeleteStopByRoadIdResponse,
      DeleteStopByRoadIdArgs
    >({
      query: ({ stopId }) => ({
        url: `/road/delete-stop/${stopId}`,
        method: 'DELETE',
        body: {},
      }),
      transformResponse: (res: ApiResponse<DeleteStopByRoadIdResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted(
        { roadId, stopId },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
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
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted(
        { roadId, stopId, stop },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
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
      query: ({ roadId, from, to }) => ({
        url: `/road/reorder-stop/${roadId}`,
        method: 'PUT',
        body: { roadId, from, to },
      }),
      transformResponse: (res: ApiResponse<ReorderStopsResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted({ roadId, from, to }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
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
  useGetOwnRoadsQuery,
  useGetDiscoverRoadsQuery,
  useCloneRoadMutation,
  useLazyShareRoadQuery,
  useGetSharedRoadQuery,
  useGetRoadByIdQuery,
  useGetRoadTerrainQuery,
  useLazyGetRoadByIdQuery,
  useGetStopByIdQuery,
  useAddStopMutation,
  useCreateRoadMutation,
  useDeleteRoadByIdMutation,
  useUpdateRoadByIdMutation,
  useUpdateStopByIdMutation,
  useDeleteStopByIdMutation,
  useReOrderStopsMutation,
} = roadService;
