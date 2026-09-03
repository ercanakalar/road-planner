import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { COLLECTION_PAGE_SIZE, DISCOVER_PAGE_SIZE } from 'constants/pagination';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import { WaypointWithAddress } from 'types/map-screen-type';
import {
  AddWaypointArgs,
  AddWaypointResponse,
  CreateRoadArgs,
  CreateRoadResponse,
  DeleteRoadByIdArgs,
  DeleteRoadByIdResponse,
  DeleteWaypointByRoadIdArgs,
  DeleteWaypointByRoadIdResponse,
  CloneRoadArgs,
  CloneRoadResponse,
  GetDiscoverRoadsArgs,
  GetDiscoverRoadsResponse,
  GetOwnRoadsArgs,
  GetOwnRoadsResponse,
  GetRoadByIdArgs,
  GetRoadByIdResponse,
  GetSharedRoadArgs,
  GetSharedRoadResponse,
  ShareRoadArgs,
  ShareRoadResponse,
  GetWaypointByIdArgs,
  GetWaypointByIdResponse,
  ReorderWaypointsArgs,
  ReorderWaypointsResponse,
  UpdateRoadByIdArgs,
  UpdateRoadByIdResponse,
  UpdateWaypointByWaypointIdArgs,
  UpdateWaypointByWaypointIdResponse,
} from 'types/store/services/roadService-type';

const TEMP_WAYPOINT_ID = 'temp-waypoint-id';

/** Shown on an optimistically added stop until the server names it. */
const PENDING_ADDRESS = 'Locating…';

const withSequentialOrder = (
  waypoints: WaypointWithAddress[],
): WaypointWithAddress[] =>
  waypoints.map((waypoint, index) =>
    waypoint.order === index + 1 ? waypoint : { ...waypoint, order: index + 1 },
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
  tagTypes: ['Road', 'Waypoint'],
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

    getWaypointById: builder.query<
      GetWaypointByIdResponse,
      GetWaypointByIdArgs
    >({
      query: ({ waypointId }) => ({
        url: `/road/waypoint/${waypointId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetWaypointByIdResponse>) =>
        transformApiResponse(res),
      providesTags: (_result, _error, { waypointId }) => [
        { type: 'Waypoint', id: waypointId },
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
      query: ({ title, description, waypoints }) => ({
        url: '/road/create',
        method: 'POST',
        body: { title, description: description ?? '', waypoints },
      }),
      transformResponse: (res: ApiResponse<CreateRoadResponse>) =>
        transformApiResponse(res),
      invalidatesTags: [{ type: 'Road', id: 'LIST' }],
    }),

    updateRoadById: builder.mutation<
      UpdateRoadByIdResponse,
      UpdateRoadByIdArgs
    >({
      query: ({ roadId, title, description, isPublic, waypoints }) => ({
        url: `/road/update/${roadId}`,
        method: 'PUT',
        body: {
          title,
          description,
          waypoints,
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

    addWaypoint: builder.mutation<AddWaypointResponse, AddWaypointArgs>({
      query: ({ roadId, waypoint }) => ({
        url: `/road/add-waypoint/${roadId}`,
        method: 'POST',
        body: {
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          order: waypoint.order,
          ...(waypoint.address ? { address: waypoint.address } : {}),
        },
      }),
      transformResponse: (res: ApiResponse<AddWaypointResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
        { type: 'Road', id: 'LIST' },
      ],
      async onQueryStarted({ roadId, waypoint }, { dispatch, queryFulfilled }) {
        const now = new Date().toISOString();
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
            (draft) => {
              draft.wayPoints.push({
                id: TEMP_WAYPOINT_ID,
                roadId,
                latitude: waypoint.latitude,
                longitude: waypoint.longitude,
                order: draft.wayPoints.length + 1,
                description: waypoint.description,
                favoriteWaypoints: [],
                createdAt: now,
                updatedAt: now,
                address: waypoint.address ?? PENDING_ADDRESS,
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

    deleteWaypointById: builder.mutation<
      DeleteWaypointByRoadIdResponse,
      DeleteWaypointByRoadIdArgs
    >({
      query: ({ waypointId }) => ({
        url: `/road/delete-waypoint/${waypointId}`,
        method: 'DELETE',
        body: {},
      }),
      transformResponse: (res: ApiResponse<DeleteWaypointByRoadIdResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted(
        { roadId, waypointId },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
            (draft) => {
              draft.wayPoints = withSequentialOrder(
                draft.wayPoints.filter(
                  (waypoint) => waypoint.id !== waypointId,
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

    updateWaypointById: builder.mutation<
      UpdateWaypointByWaypointIdResponse,
      UpdateWaypointByWaypointIdArgs
    >({
      query: ({ waypointId, waypoint }) => ({
        url: `/road/update-waypoint/${waypointId}`,
        method: 'PUT',
        body: {
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          ...(waypoint.address ? { address: waypoint.address } : {}),
        },
      }),
      transformResponse: (
        res: ApiResponse<UpdateWaypointByWaypointIdResponse>,
      ) => transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted(
        { roadId, waypointId, waypoint },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
            (draft) => {
              const target = draft.wayPoints.find(
                (candidate) => candidate.id === waypointId,
              );
              if (!target) return;
              target.latitude = waypoint.latitude;
              target.longitude = waypoint.longitude;
              target.address = waypoint.address ?? PENDING_ADDRESS;
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

    reOrderWaypoints: builder.mutation<
      ReorderWaypointsResponse,
      ReorderWaypointsArgs
    >({
      query: ({ roadId, from, to }) => ({
        url: `/road/reorder-waypoint/${roadId}`,
        method: 'PUT',
        body: { roadId, from, to },
      }),
      transformResponse: (res: ApiResponse<ReorderWaypointsResponse>) =>
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
              draft.wayPoints = withSequentialOrder(
                moveItem(draft.wayPoints, from, to),
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
  useGetWaypointByIdQuery,
  useAddWaypointMutation,
  useCreateRoadMutation,
  useDeleteRoadByIdMutation,
  useUpdateRoadByIdMutation,
  useUpdateWaypointByIdMutation,
  useDeleteWaypointByIdMutation,
  useReOrderWaypointsMutation,
} = roadService;
