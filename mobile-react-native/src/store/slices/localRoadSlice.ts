import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { createLocalId } from 'services/localRoadStorage';
import { LocalRoad, LocalRoadState, LocalWaypoint } from 'types/local-road';

const initialState: LocalRoadState = {
  roads: [],
  activeRoadId: undefined,
  isHydrated: false,
  isUploading: false,
};

const resequence = (waypoints: LocalWaypoint[]): LocalWaypoint[] =>
  waypoints.map((waypoint, index) =>
    waypoint.order === index + 1 ? waypoint : { ...waypoint, order: index + 1 },
  );

const findActive = (state: LocalRoadState): LocalRoad | undefined =>
  state.roads.find((road) => road.id === state.activeRoadId);

const touch = (road: LocalRoad) => {
  road.updatedAt = new Date().toISOString();
};

export const makeLocalRoad = (title: string): LocalRoad => {
  const now = new Date().toISOString();
  return {
    id: createLocalId('road'),
    title,
    description: '',
    wayPoints: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const localRoadSlice = createSlice({
  name: 'localRoad',
  initialState,
  reducers: {
    localRoadsHydrated(state, action: PayloadAction<LocalRoad[]>) {
      state.roads = action.payload;
      state.isHydrated = true;
      if (!findActive(state)) state.activeRoadId = action.payload[0]?.id;
    },

    localRoadCreated: {
      reducer(state, action: PayloadAction<LocalRoad>) {
        state.roads.unshift(action.payload);
        state.activeRoadId = action.payload.id;
      },
      prepare(title: string) {
        return { payload: makeLocalRoad(title) };
      },
    },

    localRoadSelected(state, action: PayloadAction<string>) {
      state.activeRoadId = action.payload;
    },

    localRoadDetailsChanged(
      state,
      action: PayloadAction<{
        roadId: string;
        title: string;
        description: string;
      }>,
    ) {
      const road = state.roads.find(
        (item) => item.id === action.payload.roadId,
      );
      if (!road) return;
      road.title = action.payload.title;
      road.description = action.payload.description;
      touch(road);
    },

    localRoadDeleted(state, action: PayloadAction<string>) {
      state.roads = state.roads.filter((road) => road.id !== action.payload);
      if (state.activeRoadId === action.payload) {
        state.activeRoadId = state.roads[0]?.id;
      }
    },

    localWaypointAdded(
      state,
      action: PayloadAction<{
        latitude: number;
        longitude: number;
        address: string;
        insertAtIndex?: number;
      }>,
    ) {
      let road = findActive(state);
      if (!road) {
        road = makeLocalRoad('My route');
        state.roads.unshift(road);
        state.activeRoadId = road.id;
      }

      const { insertAtIndex, ...values } = action.payload;

      const waypoint = {
        id: createLocalId('wp'),
        latitude: values.latitude,
        longitude: values.longitude,
        order: road.wayPoints.length + 1,
        address: values.address,
      };

      if (insertAtIndex === undefined) {
        road.wayPoints.push(waypoint);
      } else {
        const at = Math.min(Math.max(insertAtIndex, 0), road.wayPoints.length);
        road.wayPoints.splice(at, 0, waypoint);
        road.wayPoints = resequence(road.wayPoints);
      }

      touch(road);
    },

    localWaypointMoved(
      state,
      action: PayloadAction<{
        waypointId: string;
        latitude: number;
        longitude: number;
        address: string;
      }>,
    ) {
      const road = findActive(state);
      const waypoint = road?.wayPoints.find(
        (item) => item.id === action.payload.waypointId,
      );
      if (!road || !waypoint) return;

      waypoint.latitude = action.payload.latitude;
      waypoint.longitude = action.payload.longitude;
      waypoint.address = action.payload.address;
      touch(road);
    },

    localWaypointFavoriteToggled(state, action: PayloadAction<string>) {
      const road = findActive(state);
      const waypoint = road?.wayPoints.find(
        (item) => item.id === action.payload,
      );
      if (!road || !waypoint) return;

      waypoint.isFavorite = !waypoint.isFavorite;
      touch(road);
    },

    localWaypointDeleted(state, action: PayloadAction<string>) {
      const road = findActive(state);
      if (!road) return;

      road.wayPoints = resequence(
        road.wayPoints.filter((waypoint) => waypoint.id !== action.payload),
      );
      touch(road);
    },

    localWaypointsReordered(
      state,
      action: PayloadAction<{ from: number; to: number }>,
    ) {
      const road = findActive(state);
      if (!road) return;

      const { from, to } = action.payload;
      if (from === to) return;

      const next = road.wayPoints.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      road.wayPoints = resequence(next);
      touch(road);
    },

    localRoadUploadStarted(state) {
      state.isUploading = true;
    },

    localRoadUploadFinished(
      state,
      action: PayloadAction<{ uploadedIds: string[] }>,
    ) {
      state.isUploading = false;
      state.roads = state.roads.filter(
        (road) => !action.payload.uploadedIds.includes(road.id),
      );
      if (!findActive(state)) state.activeRoadId = state.roads[0]?.id;
    },

    localRoadsCleared(state) {
      state.roads = [];
      state.activeRoadId = undefined;
    },
  },
});

export const {
  localRoadsHydrated,
  localRoadCreated,
  localRoadSelected,
  localRoadDetailsChanged,
  localRoadDeleted,
  localWaypointAdded,
  localWaypointMoved,
  localWaypointDeleted,
  localWaypointFavoriteToggled,
  localWaypointsReordered,
  localRoadUploadStarted,
  localRoadUploadFinished,
  localRoadsCleared,
} = localRoadSlice.actions;

export default localRoadSlice.reducer;
