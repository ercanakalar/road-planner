import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { combineReducers } from '@reduxjs/toolkit';
import authenticationService from './services/authenticationService';
import authMiddleware from './middlewares/auth-middleware';
import reducer from './reducer';
import authReducer from './slices/authSlice';
import { profileService } from './services/profileService';

const rootReducer = combineReducers({
  ...reducer,
  auth: authReducer,
  [authenticationService.reducerPath]: authenticationService.reducer,
  [profileService.reducerPath]: profileService.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .prepend(authMiddleware.middleware)
      .concat(authenticationService.middleware)
      .concat(profileService.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
