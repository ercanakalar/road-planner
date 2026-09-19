import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MapArea, MarkedArea } from 'types/travel-map';

export interface TravelMapState {
  /** Newest first, which is the order the list under the map reads in. */
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

    /**
     * Marks a place, or moves one already marked back to the top with the
     * extent it has now. Marking is how you re-mark, so the same tap can never
     * leave the map holding the same country twice.
     */
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
