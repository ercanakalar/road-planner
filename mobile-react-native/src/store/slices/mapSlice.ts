import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RouteCoordinate } from 'types/map-screen-type';

interface MapState {
  clickedLocation?: RouteCoordinate;
  contextMenuStopId?: string;
  isContextMenuVisible: boolean;
  draggingStopId?: string;
}

const initialState: MapState = {
  clickedLocation: undefined,
  contextMenuStopId: undefined,
  isContextMenuVisible: false,
  draggingStopId: undefined,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    openContextMenuForLocation(
      state,
      action: PayloadAction<RouteCoordinate>,
    ) {
      state.clickedLocation = action.payload;
      state.contextMenuStopId = undefined;
      state.isContextMenuVisible = true;
    },
    openContextMenuForStop(state, action: PayloadAction<string>) {
      state.clickedLocation = undefined;
      state.contextMenuStopId = action.payload;
      state.isContextMenuVisible = true;
    },
    closeContextMenu(state) {
      state.isContextMenuVisible = false;
    },
    startDraggingStop(state, action: PayloadAction<string>) {
      state.draggingStopId = action.payload;
      state.isContextMenuVisible = false;
    },
    stopDraggingStop(state) {
      state.draggingStopId = undefined;
      state.contextMenuStopId = undefined;
    },
    resetMapState() {
      return initialState;
    },
  },
});

export const {
  openContextMenuForLocation,
  openContextMenuForStop,
  closeContextMenu,
  startDraggingStop,
  stopDraggingStop,
  resetMapState,
} = mapSlice.actions;

export default mapSlice.reducer;
