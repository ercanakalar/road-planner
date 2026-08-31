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
  selectedWaypointId: undefined,
};

export const roadSlice = createSlice({
  name: 'road',
  initialState,
  reducers: {
    setSelectedWaypointId: (
      state: RoadState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.selectedWaypointId = action.payload;
    },
    deleteRoadById: (
      state: RoadState,
      action: PayloadAction<{
        roadId: string;
      }>,
    ) => {
      const idToDelete = action.payload.roadId;
      state.roads = state.roads?.filter((road) => road.id !== idToDelete);
    },
    addRoad: (state: RoadState, action: PayloadAction<any>) => {
      state.roads.push(action.payload);
    },
    updateRoad: (state: RoadState, action: PayloadAction<any>) => {
      const index = state.roads.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.roads[index] = action.payload;
      }
    },
    favoriteRoad: (state: RoadState, action: PayloadAction<any>) => {
      const index = state.roads.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.roads[index] = {
          ...state.roads[index],
          isFavorite: !state.roads[index].isFavorite,
        };
      }
    },
  },
  extraReducers: (builder) => {},
});

export const {
  setSelectedWaypointId,
  deleteRoadById,
  addRoad,
  updateRoad,
  favoriteRoad,
} = roadSlice.actions;

export default roadSlice.reducer;
