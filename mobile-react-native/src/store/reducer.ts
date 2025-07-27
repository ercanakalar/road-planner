import { combineReducers } from 'redux';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import mapReducer from './slices/mapSlice';

const rootReducers = {
  auth: authReducer,
  user: userReducer,
  map: mapReducer,
};
export default combineReducers(rootReducers);
