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
    updateLocation: (
      state: RoadState,
      action: PayloadAction<{ id: string; latitude: number; longitude: number }>
    ) => {
      // const { id, latitude, longitude } = action.payload;
      // const waypoint = state.wayPoints.find((wp) => wp.id === id);
      // if (waypoint) {
      //   waypoint.latitude = latitude;
      //   waypoint.longitude = longitude;
      // }
    },
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
  extraReducers: (builder) => {
    const { getOwnRoads, getRoadById } = roadService.endpoints;
    // builder
    //   .addMatcher(getOwnRoads.matchPending, (state) => {
    //     state.isLoading = true;
    //     state.state = 'loading';
    //   })
    //   .addMatcher(getOwnRoads.matchFulfilled, (state, action) => {
    //     state.roads = action.payload as WaypointWithAddressAndId[];
    //     state.isLoading = false;
    //     state.state = 'loaded';
    //   })
    //   .addMatcher(getOwnRoads.matchRejected, (state, action) => {
    //     state.isLoading = false;
    //     state.state = 'error';
    //     state.error = action.error.message || 'Failed to load roads';
    //   })
    //   .addMatcher(getRoadById.matchPending, (state) => {
    //     state.isLoading = true;
    //     state.state = 'loading';
    //   })
    //   .addMatcher(getRoadById.matchFulfilled, (state, action) => {
    //     state.roads = action.payload as WaypointWithAddressAndId[];
    //     state.isLoading = false;
    //     state.state = 'loaded';
    //   })
    //   .addMatcher(getRoadById.matchRejected, (state, action) => {
    //     state.isLoading = false;
    //     state.state = 'error';
    //     state.error = action.error.message || 'Failed to load road by ID';
    //   });
  },
});

export const { updateLocation, setSelectedWaypointId, deleteRoadById } =
  roadSlice.actions;

export default roadSlice.reducer;
