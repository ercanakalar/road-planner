import { combineReducers } from 'redux';

import mapReducer from './slices/mapSlice';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

const rootReducers = {
  map: mapReducer,
  auth: authReducer,
  user: userReducer,
};
export default combineReducers(rootReducers);
