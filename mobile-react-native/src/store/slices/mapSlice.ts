import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface MapState {
  clickedLocation: LatLng | undefined;
  selectedMarkerId?: string;
  isContextMenuVisible: boolean;
  marker?: any;
  isDragging: boolean;
}

const initialState: MapState = {
  clickedLocation: undefined,
  selectedMarkerId: undefined,
  isContextMenuVisible: false,
  marker: undefined,
  isDragging: false,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setClickedLocation(state, action: PayloadAction<LatLng | undefined>) {
      state.clickedLocation = action.payload;
    },
    setSelectedMarkerId(state, action: PayloadAction<string | undefined>) {
      state.selectedMarkerId = action.payload;
    },
    setContextMenuVisible(state, action: PayloadAction<boolean>) {
      state.isContextMenuVisible = action.payload;
    },
    setMarker(state, action: PayloadAction<any>) {
      state.marker = action.payload;
    },
    setIsDragging(state, action: PayloadAction<boolean>) {
      state.isDragging = action.payload;
    },
    resetMapState(state) {
      state.clickedLocation = undefined;
      state.selectedMarkerId = undefined;
      state.isContextMenuVisible = false;
      state.marker = undefined;
      state.isDragging = false;
    },
  },
});

export const {
  setClickedLocation,
  setSelectedMarkerId,
  setContextMenuVisible,
  setMarker,
  setIsDragging,
  resetMapState,
} = mapSlice.actions;

export default mapSlice.reducer;
