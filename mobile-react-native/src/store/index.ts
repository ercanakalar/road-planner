import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { authenticationService } from './services/authenticationService';
import { profileService } from './services/profileService';
import { roadService } from './services/roadService';
import { favoriteService } from './services/favoriteService';

import authMiddleware from './middlewares/auth-middleware';
import persistenceMiddleware from './middlewares/persistence-middleware';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import mapReducer from './slices/mapSlice';
import settingsReducer from './slices/settingsSlice';
import localRoadReducer from './slices/localRoadSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  map: mapReducer,
  settings: settingsReducer,
  localRoad: localRoadReducer,
  [authenticationService.reducerPath]: authenticationService.reducer,
  [profileService.reducerPath]: profileService.reducer,
  [roadService.reducerPath]: roadService.reducer,
  [favoriteService.reducerPath]: favoriteService.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: { warnAfter: 128 },
      serializableCheck: { warnAfter: 128 },
    })
      .prepend(authMiddleware.middleware, persistenceMiddleware.middleware)
      .concat(
        authenticationService.middleware,
        profileService.middleware,
        roadService.middleware,
        favoriteService.middleware,
      ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export default store;
