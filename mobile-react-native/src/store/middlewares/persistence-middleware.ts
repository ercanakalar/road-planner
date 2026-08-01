import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import localRoadStorage from 'services/localRoadStorage';
import preferencesStorage from 'services/preferencesStorage';
import { setNotificationsEnabled } from 'services/notificationService';
import { localRoadSlice } from 'store/slices/localRoadSlice';
import {
  settingsRestored,
  settingSet,
  settingToggled,
} from 'store/slices/settingsSlice';
import type { RootState } from 'store';

const persistenceMiddleware = createListenerMiddleware();

persistenceMiddleware.startListening({
  matcher: isAnyOf(settingsRestored, settingToggled, settingSet),
  effect: async (_action, listenerApi) => {
    const { settings } = listenerApi.getState() as RootState;
    setNotificationsEnabled(settings.notificationsEnabled);
    await preferencesStorage.save(settings);
  },
});

const localRoadActions = Object.values(localRoadSlice.actions).filter(
  (action) => action.type !== localRoadSlice.actions.localRoadsHydrated.type,
);

persistenceMiddleware.startListening({
  predicate: (action) =>
    localRoadActions.some((creator) => creator.type === action.type),
  effect: async (_action, listenerApi) => {
    const { localRoad } = listenerApi.getState() as RootState;
    await localRoadStorage.save(localRoad.roads);
  },
});

export default persistenceMiddleware;
