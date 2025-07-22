import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RoadState } from 'types/road';
import {
  Waypoint,
  WaypointAddress,
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import { roadService } from 'store/services/roadService';

const initialState: RoadState = {
  roads: [],
  isLoading: false,
  state: 'initial',
  user: null,
  error: null,
  errors: null,
};

export const roadSlice = createSlice({
  name: 'road',
  initialState,
  reducers: {
    setSelectedWaypointId: (
      state: RoadState,
      action: PayloadAction<string | undefined>
    ) => {
      state.selectedWaypointId = action.payload;
    },
    deleteRoadById: (
      state: RoadState,
      action: PayloadAction<{
        roadId: string;
      }>
    ) => {
      const idToDelete = action.payload.roadId;
      state.roads = state.roads.filter((road) => road.id === idToDelete);
      return state;
    },
  },
  extraReducers: (builder) => {},
});

export const { setSelectedWaypointId, deleteRoadById } = roadSlice.actions;

export default roadSlice.reducer;
