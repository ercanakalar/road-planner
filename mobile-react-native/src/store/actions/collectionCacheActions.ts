import type { CollectionSnapshot } from 'services/collectionCacheStorage';
import { favoriteService } from 'store/services/favoriteService';
import { routeService } from 'store/services/routeService';
import type { AppDispatch } from 'store';

// Puts the answers saved at the end of the last session into the cache, so
// the Routes and Favourites screens open on them. Dispatched before anything
// asks the server: an answer that arrives later always replaces these.
export const hydrateCollections =
  (snapshot: CollectionSnapshot) => async (dispatch: AppDispatch) => {
    const { favorites, ownRoutes, summary } = snapshot;

    await Promise.all([
      favorites &&
        dispatch(
          favoriteService.util.upsertQueryData(
            'getFavorites',
            undefined,
            favorites,
          ),
        ),
      ownRoutes &&
        dispatch(
          routeService.util.upsertQueryData(
            'getOwnRoutes',
            undefined,
            ownRoutes,
          ),
        ),
      summary &&
        dispatch(
          routeService.util.upsertQueryData(
            'getOwnRoutesSummary',
            undefined,
            summary,
          ),
        ),
    ]);
  };

// Asks for the person's routes, totals and favourites as soon as there is a
// session, rather than when each screen is first opened.
export const prefetchCollections = () => (dispatch: AppDispatch) => {
  dispatch(
    routeService.endpoints.getOwnRoutes.initiate(undefined, {
      subscribe: false,
      forceRefetch: true,
    }),
  );
  dispatch(
    routeService.util.prefetch('getOwnRoutesSummary', undefined, {
      force: true,
    }),
  );
  dispatch(
    favoriteService.util.prefetch('getFavorites', undefined, { force: true }),
  );
};
