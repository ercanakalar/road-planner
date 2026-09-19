import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

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

export default persistenceMiddleware;
