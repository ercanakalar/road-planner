import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MapArea, MarkedArea } from 'types/travel-map';

export interface TravelMapState {
  areas: MarkedArea[];
  isHydrated: boolean;
}

export const travelMapInitialState: TravelMapState = {
  areas: [],
  isHydrated: false,
};

export const travelMapSlice = createSlice({
  name: 'travelMap',
  initialState: travelMapInitialState,
  reducers: {
    travelAreasHydrated(state, action: PayloadAction<MarkedArea[]>) {
      state.areas = action.payload;
      state.isHydrated = true;
    },

    areaMarked: {
      reducer(state, action: PayloadAction<MarkedArea>) {
        state.areas = [
          action.payload,
          ...state.areas.filter(
            (area) => area.placeId !== action.payload.placeId,
          ),
        ];
      },
      prepare(area: MapArea) {
        return { payload: { ...area, markedAt: new Date().toISOString() } };
      },
    },

    areaUnmarked(state, action: PayloadAction<string>) {
      state.areas = state.areas.filter((area) => area.placeId !== action.payload);
    },

    travelMapCleared(state) {
      state.areas = [];
    },
  },
});

export const {
  travelAreasHydrated,
  areaMarked,
  areaUnmarked,
  travelMapCleared,
} = travelMapSlice.actions;

export default travelMapSlice.reducer;
