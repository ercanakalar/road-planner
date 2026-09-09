import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { routeService } from 'store/services/routeService';
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
  ToggleFavoriteRouteArgs,
  ToggleFavoriteStopArgs,
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

    toggleFavoriteRoute: builder.mutation<
      ToggleFavoriteResponse,
      ToggleFavoriteRouteArgs
    >({
      query: ({ routeId }) => ({
        url: '/favorites/toggle-road',
        method: 'POST',
        // `roadId` is the server's key for it; see the note on routeService.
        body: { roadId: routeId },
      }),
      transformResponse: (res: ApiResponse<ToggleFavoriteResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Favorite', id: 'LIST' }],
      async onQueryStarted({ routeId }, { dispatch, queryFulfilled }) {
        const favoritesPatch = dispatch(
          favoriteService.util.updateQueryData(
            'getFavorites',
            undefined,
            (draft) => removeFromFavorites(draft, routeId),
          ),
        );

        const patch = dispatch(
          routeService.util.updateQueryData(
            'getOwnRoutes',
            undefined,
            (draft) => {
              const target = draft.find((route) => route.id === routeId);
              if (!target) return;
              target.isFavorite = !target.isFavorite;
            },
          ),
        );

        try {
          await queryFulfilled;
          dispatch(
            routeService.util.invalidateTags([{ type: 'Route', id: 'LIST' }]),
          );
        } catch {
          patch.undo();
          favoritesPatch.undo();
        }
      },
    }),

    toggleFavoriteStop: builder.mutation<
      ToggleFavoriteResponse,
      ToggleFavoriteStopArgs
    >({
      query: ({ stopId }) => ({
        url: '/favorites/toggle-stop',
        method: 'POST',
        body: { stopId },
      }),
      transformResponse: (res: ApiResponse<ToggleFavoriteResponse>) =>
        transformApiResponseWithToast(res),
      invalidatesTags: [{ type: 'Favorite', id: 'LIST' }],
      async onQueryStarted(
        { stopId, routeId },
        { dispatch, queryFulfilled },
      ) {
        const favoritesPatch = dispatch(
          favoriteService.util.updateQueryData(
            'getFavorites',
            undefined,
            (draft) => removeFromFavorites(draft, stopId),
          ),
        );

        const patch = routeId
          ? dispatch(
              routeService.util.updateQueryData(
                'getRouteById',
                { routeId },
                (draft) => {
                  const target = draft.stops.find(
                    (stop) => stop.id === stopId,
                  );
                  if (!target) return;
                  target.favoriteStops = target.favoriteStops.length
                    ? []
                    : [
                        {
                          id: 'temp-favorite-id',
                          userId: '',
                          stopsId: stopId,
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
          if (routeId) {
            dispatch(
              routeService.util.invalidateTags([{ type: 'Route', id: routeId }]),
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
        // The route segment is still `road` on the server side.
        url: `/favorites/${kind === 'route' ? 'road' : kind}/${favoriteId}`,
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
  useToggleFavoriteStopMutation,
  useToggleFavoriteRouteMutation,
} = favoriteService;
