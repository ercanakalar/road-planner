import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import collectionCacheStorage, {
  CollectionPart,
} from 'services/collectionCacheStorage';
import kvkkStorage from 'services/kvkkStorage';
import localRouteStorage from 'services/localRouteStorage';
import preferencesStorage from 'services/preferencesStorage';
import travelMapStorage from 'services/travelMapStorage';
import { setNotificationsEnabled } from 'services/notificationService';
import { localRouteSlice } from 'store/slices/localRouteSlice';
import {
  areaMarked,
  areaUnmarked,
  travelMapCleared,
} from 'store/slices/travelMapSlice';
import { kvkkAccepted, kvkkWithdrawn } from 'store/slices/kvkkSlice';
import { favoriteService } from 'store/services/favoriteService';
import { routeService } from 'store/services/routeService';
import {
  languageSet,
  settingsRestored,
  settingSet,
  settingToggled,
  themeModeSet,
} from 'store/slices/settingsSlice';
import type { RootState } from 'store';

const persistenceMiddleware = createListenerMiddleware();

persistenceMiddleware.startListening({
  matcher: isAnyOf(
    settingsRestored,
    settingToggled,
    settingSet,
    themeModeSet,
    languageSet,
  ),
  effect: async (_action, listenerApi) => {
    const { settings } = listenerApi.getState() as RootState;
    setNotificationsEnabled(settings.notificationsEnabled);
    await preferencesStorage.save(settings);
  },
});

const localRouteActions = Object.values(localRouteSlice.actions).filter(
  (action) => action.type !== localRouteSlice.actions.localRoutesHydrated.type,
);

persistenceMiddleware.startListening({
  predicate: (action) =>
    localRouteActions.some((creator) => creator.type === action.type),
  effect: async (_action, listenerApi) => {
    const { localRoute } = listenerApi.getState() as RootState;
    await localRouteStorage.save(localRoute.routes);
  },
});

persistenceMiddleware.startListening({
  matcher: isAnyOf(areaMarked, areaUnmarked, travelMapCleared),
  effect: async (_action, listenerApi) => {
    const { travelMap } = listenerApi.getState() as RootState;
    await travelMapStorage.save(travelMap.areas);
  },
});

persistenceMiddleware.startListening({
  actionCreator: kvkkAccepted,
  effect: async (action) => {
    await kvkkStorage.save(action.payload);
  },
});

persistenceMiddleware.startListening({
  actionCreator: kvkkWithdrawn,
  effect: async () => {
    await kvkkStorage.clear();
  },
});

// The latest answers for the Routes and Favourites screens, kept for the next
// launch. Only the first page of routes is kept: it is what the screen opens
// on, and the rest is fetched again as the list scrolls.
const { getFavorites } = favoriteService.endpoints;
const { getOwnRoutes, getOwnRoutesSummary } = routeService.endpoints;

const collectionPartOf = (
  action: unknown,
  state: RootState,
): CollectionPart | null => {
  if (getFavorites.matchFulfilled(action)) {
    const { data } = getFavorites.select(undefined)(state);
    return data ? { favorites: data } : null;
  }
  if (getOwnRoutes.matchFulfilled(action)) {
    const { data } = getOwnRoutes.select(undefined)(state);
    if (!data?.pages.length) return null;
    return {
      ownRoutes: { pages: [data.pages[0]], pageParams: [data.pageParams[0]] },
    };
  }
  if (getOwnRoutesSummary.matchFulfilled(action)) {
    const { data } = getOwnRoutesSummary.select(undefined)(state);
    return data ? { summary: data } : null;
  }
  return null;
};

persistenceMiddleware.startListening({
  matcher: isAnyOf(
    getFavorites.matchFulfilled,
    getOwnRoutes.matchFulfilled,
    getOwnRoutesSummary.matchFulfilled,
  ),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const { userId, isLoggedIn } = state.auth;
    if (!isLoggedIn || !userId) return;

    const part = collectionPartOf(action, state);
    if (part) await collectionCacheStorage.save(userId, part);
  },
});

export default persistenceMiddleware;
