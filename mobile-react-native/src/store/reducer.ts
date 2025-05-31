import { combineReducers } from 'redux';

import mapReducer from './slices/mapSlice';

const rootReducers = {
  map: mapReducer,
};
export default combineReducers(rootReducers);
