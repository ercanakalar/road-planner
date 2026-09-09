import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { createLocalId } from 'services/localRouteStorage';
import { LocalRoute, LocalRouteState, LocalStop } from 'types/local-route';

const initialState: LocalRouteState = {
  routes: [],
  activeRouteId: undefined,
  isHydrated: false,
  isUploading: false,
};

const resequence = (stops: LocalStop[]): LocalStop[] =>
  stops.map((stop, index) =>
    stop.order === index + 1 ? stop : { ...stop, order: index + 1 },
  );

const findActive = (state: LocalRouteState): LocalRoute | undefined =>
  state.routes.find((route) => route.id === state.activeRouteId);

const touch = (route: LocalRoute) => {
  route.updatedAt = new Date().toISOString();
};

export const makeLocalRoute = (title: string): LocalRoute => {
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

export const localRouteSlice = createSlice({
  name: 'localRoute',
  initialState,
  reducers: {
    localRoutesHydrated(state, action: PayloadAction<LocalRoute[]>) {
      state.routes = action.payload;
      state.isHydrated = true;
      if (!findActive(state)) state.activeRouteId = action.payload[0]?.id;
    },

    localRouteCreated: {
      reducer(state, action: PayloadAction<LocalRoute>) {
        state.routes.unshift(action.payload);
        state.activeRouteId = action.payload.id;
      },
      prepare(title: string) {
        return { payload: makeLocalRoute(title) };
      },
    },

    localRouteSelected(state, action: PayloadAction<string>) {
      state.activeRouteId = action.payload;
    },

    localRouteDetailsChanged(
      state,
      action: PayloadAction<{
        routeId: string;
        title: string;
        description: string;
      }>,
    ) {
      const route = state.routes.find(
        (item) => item.id === action.payload.routeId,
      );
      if (!route) return;
      route.title = action.payload.title;
      route.description = action.payload.description;
      touch(route);
    },

    localRouteDeleted(state, action: PayloadAction<string>) {
      state.routes = state.routes.filter((route) => route.id !== action.payload);
      if (state.activeRouteId === action.payload) {
        state.activeRouteId = state.routes[0]?.id;
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
      let route = findActive(state);
      if (!route) {
        route = makeLocalRoute('My route');
        state.routes.unshift(route);
        state.activeRouteId = route.id;
      }

      const { insertAtIndex, ...values } = action.payload;

      const stop = {
        id: createLocalId('wp'),
        latitude: values.latitude,
        longitude: values.longitude,
        order: route.stops.length + 1,
        address: values.address,
      };

      if (insertAtIndex === undefined) {
        route.stops.push(stop);
      } else {
        const at = Math.min(Math.max(insertAtIndex, 0), route.stops.length);
        route.stops.splice(at, 0, stop);
        route.stops = resequence(route.stops);
      }

      touch(route);
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
      const route = findActive(state);
      const stop = route?.stops.find(
        (item) => item.id === action.payload.stopId,
      );
      if (!route || !stop) return;

      stop.latitude = action.payload.latitude;
      stop.longitude = action.payload.longitude;
      stop.address = action.payload.address;
      touch(route);
    },

    localStopFavoriteToggled(state, action: PayloadAction<string>) {
      const route = findActive(state);
      const stop = route?.stops.find(
        (item) => item.id === action.payload,
      );
      if (!route || !stop) return;

      stop.isFavorite = !stop.isFavorite;
      touch(route);
    },

    localStopDeleted(state, action: PayloadAction<string>) {
      const route = findActive(state);
      if (!route) return;

      route.stops = resequence(
        route.stops.filter((stop) => stop.id !== action.payload),
      );
      touch(route);
    },

    localStopsReordered(
      state,
      action: PayloadAction<{ from: number; to: number }>,
    ) {
      const route = findActive(state);
      if (!route) return;

      const { from, to } = action.payload;
      if (from === to) return;

      const next = route.stops.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      route.stops = resequence(next);
      touch(route);
    },

    localRouteUploadStarted(state) {
      state.isUploading = true;
    },

    localRouteUploadFinished(
      state,
      action: PayloadAction<{ uploadedIds: string[] }>,
    ) {
      state.isUploading = false;
      state.routes = state.routes.filter(
        (route) => !action.payload.uploadedIds.includes(route.id),
      );
      if (!findActive(state)) state.activeRouteId = state.routes[0]?.id;
    },

    /**
     * Lands a whole route at once, which is what an import is: the stops are
     * already in order and already have their addresses, so they arrive as one
     * route rather than as a run of `localStopAdded` calls that would each
     * re-rank the list and each mark the route as touched.
     *
     * The new route becomes the active one, because the point of importing is to
     * look at it.
     */
    localRouteImported: {
      reducer(state, action: PayloadAction<LocalRoute>) {
        state.routes.unshift(action.payload);
        state.activeRouteId = action.payload.id;
      },
      prepare(input: {
        title: string;
        stops: Omit<LocalStop, 'id' | 'order'>[];
      }) {
        const route = makeLocalRoute(input.title);

        route.stops = input.stops.map((stop, index) => ({
          ...stop,
          id: createLocalId('wp'),
          order: index + 1,
        }));

        return { payload: route };
      },
    },

    localRoutesCleared(state) {
      state.routes = [];
      state.activeRouteId = undefined;
    },
  },
});

export const {
  localRoutesHydrated,
  localRouteCreated,
  localRouteSelected,
  localRouteDetailsChanged,
  localRouteDeleted,
  localRouteImported,
  localStopAdded,
  localStopMoved,
  localStopDeleted,
  localStopFavoriteToggled,
  localStopsReordered,
  localRouteUploadStarted,
  localRouteUploadFinished,
  localRoutesCleared,
} = localRouteSlice.actions;

export default localRouteSlice.reducer;
