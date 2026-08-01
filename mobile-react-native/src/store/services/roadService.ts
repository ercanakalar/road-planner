import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { COLLECTION_PAGE_SIZE } from 'constants/pagination';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import {
  AddWaypointArgs,
  AddWaypointResponse,
  CreateRoadArgs,
  CreateRoadResponse,
  DeleteRoadByIdArgs,
  DeleteRoadByIdResponse,
  DeleteWaypointByRoadIdArgs,
  DeleteWaypointByRoadIdResponse,
  GetOwnRoadsArgs,
  GetOwnRoadsResponse,
  GetRoadByIdArgs,
  GetRoadByIdResponse,
  GetWaypointByIdArgs,
  GetWaypointByIdResponse,
  ReorderWaypointsArgs,
  ReorderWaypointsResponse,
  UpdateRoadByIdArgs,
  UpdateRoadByIdResponse,
  UpdateWaypointByWaypointIdArgs,
  UpdateWaypointByWaypointIdResponse,
} from 'types/store/services/roadService-type';

export const TEMP_WAYPOINT_ID = 'temp-waypoint-id';

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
        { type: 'Road', id: roadId },
      ],
      async onQueryStarted({ roadId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getOwnRoads',
            undefined,
            (draft) => draft.filter((road) => road.id !== roadId),
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
      query: ({ roadId, title, description, waypoints }) => ({
        url: `/road/update/${roadId}`,
        method: 'PUT',
        body: { title, description, waypoints },
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
          address: waypoint.address,
        },
      }),
      transformResponse: (res: ApiResponse<AddWaypointResponse>) =>
        transformApiResponse(res),
      invalidatesTags: (_result, _error, { roadId }) => [
        { type: 'Road', id: roadId },
        { type: 'Road', id: 'LIST' },
      ],
      async onQueryStarted(
        { roadId, waypoint },
        { dispatch, queryFulfilled },
      ) {
        const now = new Date().toISOString();
        const patch = dispatch(
          roadService.util.updateQueryData(
            'getRoadById',
            { roadId },
            (draft) => {
              draft.wayPoints.push({
                id: TEMP_WAYPOINT_ID,
                roadId,
                addressInfoId: '',
                latitude: waypoint.latitude,
                longitude: waypoint.longitude,
                order: draft.wayPoints.length + 1,
                description: waypoint.description,
                favoriteWaypoints: [],
                createdAt: now,
                updatedAt: now,
                address: { id: TEMP_WAYPOINT_ID, ...waypoint.address },
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
          address: waypoint.address,
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
              target.address = { ...target.address, ...waypoint.address };
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
      async onQueryStarted(
        { roadId, from, to },
        { dispatch, queryFulfilled },
      ) {
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

export const selectRoadWaypoints = (
  road: WaypointWithAddressAndId | undefined,
): WaypointWithAddress[] => road?.wayPoints ?? [];

export const {
  useGetOwnRoadsQuery,
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
