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
import kvkkReducer from './slices/kvkkSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  map: mapReducer,
  settings: settingsReducer,
  localRoad: localRoadReducer,
  kvkk: kvkkReducer,
  [authenticationService.reducerPath]: authenticationService.reducer,
  [profileService.reducerPath]: profileService.reducer,
  [roadService.reducerPath]: roadService.reducer,
  [favoriteService.reducerPath]: favoriteService.reducer,
});

/**
 * The cache slices hold every route and favourite the app has loaded, and in a
 * development build both of these checks walk the whole tree on every single
 * action. RTK Query already treats its own cache as immutable, so the checks
 * are pointed at the hand-written slices, where an accidental mutation is a
 * real risk. Both are off entirely in a release build.
 */
const API_REDUCER_PATHS = [
  authenticationService.reducerPath,
  profileService.reducerPath,
  roadService.reducerPath,
  favoriteService.reducerPath,
];

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: { warnAfter: 128, ignoredPaths: API_REDUCER_PATHS },
      serializableCheck: { warnAfter: 128, ignoredPaths: API_REDUCER_PATHS },
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
