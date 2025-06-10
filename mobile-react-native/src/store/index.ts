import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { combineReducers } from '@reduxjs/toolkit';

import { authenticationService } from './services/authenticationService';
import { profileService } from './services/profileService';
import { roadService } from './services/roadService';

import authMiddleware from './middlewares/auth-middleware';


import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import roadReducer from './slices/roadSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  road: roadReducer,
  [authenticationService.reducerPath]: authenticationService.reducer,
  [profileService.reducerPath]: profileService.reducer,
  [roadService.reducerPath]: roadService.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .prepend(authMiddleware.middleware)
      .concat(authenticationService.middleware)
      .concat(profileService.middleware)
      .concat(roadService.middleware)
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
