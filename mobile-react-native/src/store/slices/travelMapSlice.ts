import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MapArea, MarkedArea } from 'types/travel-map';
import { withColorSlots } from 'utils/travelCities';

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
    // Areas saved before cities kept their colour get one here, the same one
    // at every launch, until the next change stores it.
    travelAreasHydrated(state, action: PayloadAction<MarkedArea[]>) {
      state.areas = withColorSlots(action.payload);
      state.isHydrated = true;
    },

    areaMarked: {
      reducer(state, action: PayloadAction<MarkedArea>) {
        state.areas = withColorSlots([
          action.payload,
          ...state.areas.filter(
            (area) => area.placeId !== action.payload.placeId,
          ),
        ]);
      },
      prepare(area: MapArea) {
        // The colour is the map's to give, from the cities already on it.
        const { colorSlot: _ignored, ...rest } = area as MarkedArea;

        return { payload: { ...rest, markedAt: new Date().toISOString() } };
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
