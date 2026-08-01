import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RouteCoordinate } from 'types/map-screen-type';

export interface MapState {
  clickedLocation?: RouteCoordinate;
  contextMenuWaypointId?: string;
  isContextMenuVisible: boolean;
  draggingWaypointId?: string;
}

const initialState: MapState = {
  clickedLocation: undefined,
  contextMenuWaypointId: undefined,
  isContextMenuVisible: false,
  draggingWaypointId: undefined,
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
      state.contextMenuWaypointId = undefined;
      state.isContextMenuVisible = true;
    },
    openContextMenuForWaypoint(state, action: PayloadAction<string>) {
      state.clickedLocation = undefined;
      state.contextMenuWaypointId = action.payload;
      state.isContextMenuVisible = true;
    },
    closeContextMenu(state) {
      state.isContextMenuVisible = false;
    },
    startDraggingWaypoint(state, action: PayloadAction<string>) {
      state.draggingWaypointId = action.payload;
      state.isContextMenuVisible = false;
    },
    stopDraggingWaypoint(state) {
      state.draggingWaypointId = undefined;
      state.contextMenuWaypointId = undefined;
    },
    resetMapState() {
      return initialState;
    },
  },
});

export const {
  openContextMenuForLocation,
  openContextMenuForWaypoint,
  closeContextMenu,
  startDraggingWaypoint,
  stopDraggingWaypoint,
  resetMapState,
} = mapSlice.actions;

export default mapSlice.reducer;
