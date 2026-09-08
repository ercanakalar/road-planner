import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { createLocalId } from 'services/localRoadStorage';
import { LocalRoad, LocalRoadState, LocalStop } from 'types/local-road';

const initialState: LocalRoadState = {
  roads: [],
  activeRoadId: undefined,
  isHydrated: false,
  isUploading: false,
};

const resequence = (stops: LocalStop[]): LocalStop[] =>
  stops.map((stop, index) =>
    stop.order === index + 1 ? stop : { ...stop, order: index + 1 },
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
    stops: [],
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

    localStopAdded(
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

      const stop = {
        id: createLocalId('wp'),
        latitude: values.latitude,
        longitude: values.longitude,
        order: road.stops.length + 1,
        address: values.address,
      };

      if (insertAtIndex === undefined) {
        road.stops.push(stop);
      } else {
        const at = Math.min(Math.max(insertAtIndex, 0), road.stops.length);
        road.stops.splice(at, 0, stop);
        road.stops = resequence(road.stops);
      }

      touch(road);
    },

    localStopMoved(
      state,
      action: PayloadAction<{
        stopId: string;
        latitude: number;
        longitude: number;
        address: string;
      }>,
    ) {
      const road = findActive(state);
      const stop = road?.stops.find(
        (item) => item.id === action.payload.stopId,
      );
      if (!road || !stop) return;

      stop.latitude = action.payload.latitude;
      stop.longitude = action.payload.longitude;
      stop.address = action.payload.address;
      touch(road);
    },

    localStopFavoriteToggled(state, action: PayloadAction<string>) {
      const road = findActive(state);
      const stop = road?.stops.find(
        (item) => item.id === action.payload,
      );
      if (!road || !stop) return;

      stop.isFavorite = !stop.isFavorite;
      touch(road);
    },

    localStopDeleted(state, action: PayloadAction<string>) {
      const road = findActive(state);
      if (!road) return;

      road.stops = resequence(
        road.stops.filter((stop) => stop.id !== action.payload),
      );
      touch(road);
    },

    localStopsReordered(
      state,
      action: PayloadAction<{ from: number; to: number }>,
    ) {
      const road = findActive(state);
      if (!road) return;

      const { from, to } = action.payload;
      if (from === to) return;

      const next = road.stops.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      road.stops = resequence(next);
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

    /**
     * Lands a whole route at once, which is what an import is: the stops are
     * already in order and already have their addresses, so they arrive as one
     * road rather than as a run of `localStopAdded` calls that would each
     * re-rank the list and each mark the road as touched.
     *
     * The new road becomes the active one, because the point of importing is to
     * look at it.
     */
    localRoadImported: {
      reducer(state, action: PayloadAction<LocalRoad>) {
        state.roads.unshift(action.payload);
        state.activeRoadId = action.payload.id;
      },
      prepare(input: {
        title: string;
        stops: Omit<LocalStop, 'id' | 'order'>[];
      }) {
        const road = makeLocalRoad(input.title);

        road.stops = input.stops.map((stop, index) => ({
          ...stop,
          id: createLocalId('wp'),
          order: index + 1,
        }));

        return { payload: road };
      },
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
  localRoadImported,
  localStopAdded,
  localStopMoved,
  localStopDeleted,
  localStopFavoriteToggled,
  localStopsReordered,
  localRoadUploadStarted,
  localRoadUploadFinished,
  localRoadsCleared,
} = localRoadSlice.actions;

export default localRoadSlice.reducer;
