import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { roadService } from 'store/services/roadService';
import {
  applyFavoriteAnnotation,
  normalizeFavorites,
  removeFromFavorites,
} from 'store/adapters/favoriteAdapter';
import { COLLECTION_PAGE_SIZE } from 'constants/pagination';
import { ApiResponse } from 'types/store/bases';
import {
  GetAllFavoritesArgs,
  GetAllFavoritesResponse,
  RawFavorites,
  ToggleFavoriteResponse,
  ToggleFavoriteRoadArgs,
  ToggleFavoriteWaypointArgs,
  UpdateFavoriteAnnotationArgs,
  UpdateFavoriteAnnotationResponse,
} from 'types/store/services/favoriteService-type';

export const favoriteService = createApi({
  reducerPath: 'favoriteService',
  baseQuery: baseQuery(),
  tagTypes: ['Favorite'],
  keepUnusedDataFor: 300,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  endpoints: (builder) => ({
    getFavorites: builder.query<GetAllFavoritesResponse, GetAllFavoritesArgs>({
      query: () => ({
        url: '/favorites',
        method: 'GET',
        params: { limit: COLLECTION_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<RawFavorites>) =>
        normalizeFavorites(transformApiResponse(res)),
      providesTags: [{ type: 'Favorite', id: 'LIST' }],
    }),

    toggleFavoriteRoad: builder.mutation<
      ToggleFavoriteResponse,
      ToggleFavoriteRoadArgs
    >({
      query: ({ roadId }) => ({
        url: '/favorites/toggle-road',
        method: 'POST',
        body: { roadId },
      }),
      transformResponse: (res: ApiResponse<ToggleFavoriteResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Favorite', id: 'LIST' }],
      async onQueryStarted({ roadId }, { dispatch, queryFulfilled }) {
        const favoritesPatch = dispatch(
          favoriteService.util.updateQueryData(
            'getFavorites',
            undefined,
            (draft) => removeFromFavorites(draft, roadId),
          ),
        );

        const patch = dispatch(
          roadService.util.updateQueryData(
            'getOwnRoads',
            undefined,
            (draft) => {
              const target = draft.find((road) => road.id === roadId);
              if (!target) return;
              target.isFavorite = !target.isFavorite;
            },
          ),
        );

        try {
          await queryFulfilled;
          dispatch(
            roadService.util.invalidateTags([{ type: 'Road', id: 'LIST' }]),
          );
        } catch {
          patch.undo();
          favoritesPatch.undo();
        }
      },
    }),

    toggleFavoriteWaypoint: builder.mutation<
      ToggleFavoriteResponse,
      ToggleFavoriteWaypointArgs
    >({
      query: ({ waypointId }) => ({
        url: '/favorites/toggle-waypoint',
        method: 'POST',
        body: { waypointId },
      }),
      transformResponse: (res: ApiResponse<ToggleFavoriteResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Favorite', id: 'LIST' }],
      async onQueryStarted(
        { waypointId, roadId },
        { dispatch, queryFulfilled },
      ) {
        const favoritesPatch = dispatch(
          favoriteService.util.updateQueryData(
            'getFavorites',
            undefined,
            (draft) => removeFromFavorites(draft, waypointId),
          ),
        );

        const patch = roadId
          ? dispatch(
              roadService.util.updateQueryData(
                'getRoadById',
                { roadId },
                (draft) => {
                  const target = draft.wayPoints.find(
                    (waypoint) => waypoint.id === waypointId,
                  );
                  if (!target) return;
                  target.favoriteWaypoints = target.favoriteWaypoints.length
                    ? []
                    : [
                        {
                          id: 'temp-favorite-id',
                          userId: '',
                          wayPointsId: waypointId,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                      ];
                },
              ),
            )
          : undefined;

        try {
          await queryFulfilled;
          if (roadId) {
            dispatch(
              roadService.util.invalidateTags([{ type: 'Road', id: roadId }]),
            );
          }
        } catch {
          patch?.undo();
          favoritesPatch.undo();
        }
      },
    }),
    updateFavoriteAnnotation: builder.mutation<
      UpdateFavoriteAnnotationResponse,
      UpdateFavoriteAnnotationArgs
    >({
      query: ({ favoriteId, kind, title, description }) => ({
        url: `/favorites/${kind}/${favoriteId}`,
        method: 'PATCH',
        body: { title, description },
      }),
      transformResponse: (res: ApiResponse<UpdateFavoriteAnnotationResponse>) =>
        transformApiResponse(res),
      async onQueryStarted(
        { favoriteId, title, description },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          favoriteService.util.updateQueryData(
            'getFavorites',
            undefined,
            (draft) =>
              applyFavoriteAnnotation(draft, favoriteId, {
                title,
                description,
              }),
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
  useGetFavoritesQuery,
  useUpdateFavoriteAnnotationMutation,
  useToggleFavoriteWaypointMutation,
  useToggleFavoriteRoadMutation,
} = favoriteService;
