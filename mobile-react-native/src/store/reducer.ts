import { combineReducers } from 'redux';

import mapReducer from './slices/mapSlice';
import authReducer from './slices/authSlice';

const rootReducers = {
  map: mapReducer,
  auth: authReducer,
};
export default combineReducers(rootReducers);
