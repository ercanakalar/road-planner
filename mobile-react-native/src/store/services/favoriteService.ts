import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { roadService } from 'store/services/roadService';
import {
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
              target.favoriteRoads = target.isFavorite
                ? [
                    {
                      id: 'temp-favorite-id',
                      userId: target.userId,
                      roadId: target.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ]
                : [];
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
  }),
});

export const {
  useGetFavoritesQuery,
  useToggleFavoriteWaypointMutation,
  useToggleFavoriteRoadMutation,
} = favoriteService;
