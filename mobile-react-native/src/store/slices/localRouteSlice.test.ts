import reducer, {
  localRouteCreated,
  localRouteImported,
  localRouteDeleted,
  localRouteUploadFinished,
  localRoutesHydrated,
  localStopAdded,
  localStopDeleted,
  localStopFavoriteToggled,
  localStopMoved,
  localStopsReordered,
  makeLocalRoute,
} from './localRouteSlice';
import { LocalRoute } from 'types/local-route';

const address = 'Somewhere, Fatih, İstanbul, TR';

const addPin = (state: ReturnType<typeof reducer>, latitude: number) =>
  reducer(state, localStopAdded({ latitude, longitude: 1, address }));

const routeWithPins = (count: number) => {
  let state = reducer(undefined, localRouteCreated('Trip'));
  for (let index = 0; index < count; index += 1) {
    state = addPin(state, index + 1);
  }
  return state;
};

describe('localRouteSlice', () => {
  it('hydrates from storage and selects the first route', () => {
    const stored: LocalRoute[] = [makeLocalRoute('A'), makeLocalRoute('B')];
    const state = reducer(undefined, localRoutesHydrated(stored));

    expect(state.routes).toHaveLength(2);
    expect(state.activeRouteId).toBe(stored[0].id);
    expect(state.isHydrated).toBe(true);
  });

  it('creates a route on the first pin so nothing has to be named first', () => {
    const state = addPin(reducer(undefined, localRoutesHydrated([])), 41);

    expect(state.routes).toHaveLength(1);
    expect(state.routes[0].stops).toHaveLength(1);
    expect(state.activeRouteId).toBe(state.routes[0].id);
  });

  it('numbers stops from one as they are added', () => {
    const state = routeWithPins(3);
    expect(state.routes[0].stops.map((w) => w.order)).toEqual([1, 2, 3]);
  });

  it('closes the gap in ordering after a delete', () => {
    const state = routeWithPins(3);
    const middleId = state.routes[0].stops[1].id;
    const next = reducer(state, localStopDeleted(middleId));

    expect(next.routes[0].stops.map((w) => w.order)).toEqual([1, 2]);
    expect(next.routes[0].stops.map((w) => w.latitude)).toEqual([1, 3]);
  });

  it('renumbers after a reorder', () => {
    const state = routeWithPins(3);
    const next = reducer(state, localStopsReordered({ from: 2, to: 0 }));

    expect(next.routes[0].stops.map((w) => w.latitude)).toEqual([3, 1, 2]);
    expect(next.routes[0].stops.map((w) => w.order)).toEqual([1, 2, 3]);
  });

  it('ignores a reorder that does not move anything', () => {
    const state = routeWithPins(2);
    const next = reducer(state, localStopsReordered({ from: 1, to: 1 }));
    expect(next.routes[0].stops).toEqual(state.routes[0].stops);
  });

  it('moves a pin and keeps its new address', () => {
    const state = routeWithPins(1);
    const stopId = state.routes[0].stops[0].id;
    const moved = 'Elsewhere, Fatih, İstanbul, TR';

    const next = reducer(
      state,
      localStopMoved({
        stopId,
        latitude: 50,
        longitude: 60,
        address: moved,
      }),
    );

    expect(next.routes[0].stops[0]).toMatchObject({
      latitude: 50,
      longitude: 60,
      address: moved,
    });
  });

  it('picks another route when the active one is deleted', () => {
    const first = reducer(undefined, localRouteCreated('A'));
    const second = reducer(first, localRouteCreated('B'));
    const next = reducer(second, localRouteDeleted(second.activeRouteId!));

    expect(next.routes).toHaveLength(1);
    expect(next.activeRouteId).toBe(next.routes[0].id);
  });

  it('keeps routes that failed to upload', () => {
    const first = reducer(undefined, localRouteCreated('A'));
    const both = reducer(first, localRouteCreated('B'));
    const uploadedId = both.routes[0].id;

    const next = reducer(
      both,
      localRouteUploadFinished({ uploadedIds: [uploadedId] }),
    );

    expect(next.routes).toHaveLength(1);
    expect(next.routes[0].id).not.toBe(uploadedId);
    expect(next.isUploading).toBe(false);
    expect(next.activeRouteId).toBe(next.routes[0].id);
  });

  it('stars a stop on the device and unstars it again', () => {
    let state = routeWithPins(2);
    const [first] = state.routes[0].stops;

    expect(first.isFavorite).toBeUndefined();

    state = reducer(state, localStopFavoriteToggled(first.id));
    expect(state.routes[0].stops[0].isFavorite).toBe(true);
    expect(state.routes[0].stops[1].isFavorite).toBeUndefined();

    state = reducer(state, localStopFavoriteToggled(first.id));
    expect(state.routes[0].stops[0].isFavorite).toBe(false);
  });

  it('ignores a star for a stop that is not on the active route', () => {
    const state = routeWithPins(1);
    const next = reducer(state, localStopFavoriteToggled('wp-missing'));

    expect(next.routes[0].stops[0].isFavorite).toBeUndefined();
  });
});

describe('adding a place found along the route', () => {
  const insertAt = (
    state: ReturnType<typeof reducer>,
    latitude: number,
    index: number,
  ) =>
    reducer(
      state,
      localStopAdded({
        latitude,
        longitude: 1,
        address,
        insertAtIndex: index,
      }),
    );

  it('drops the stop between the two it is passed between', () => {
    const state = insertAt(routeWithPins(2), 99, 1);

    expect(state.routes[0].stops.map((point) => point.latitude)).toEqual([
      1, 99, 2,
    ]);
  });

  it('renumbers the stops it pushed along', () => {
    const state = insertAt(routeWithPins(3), 99, 1);

    expect(state.routes[0].stops.map((point) => point.order)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('appends when no position is given, as a dropped pin does', () => {
    const state = addPin(routeWithPins(2), 99);

    expect(state.routes[0].stops.map((point) => point.latitude)).toEqual([
      1, 2, 99,
    ]);
  });

  it('keeps a position past the end of the route inside it', () => {
    const state = insertAt(routeWithPins(2), 99, 9);

    expect(state.routes[0].stops.map((point) => point.latitude)).toEqual([
      1, 2, 99,
    ]);
  });
});

describe('localRouteImported', () => {
  const stops = [
    { latitude: 41.0082, longitude: 28.9784, address: 'Kadıköy' },
    { latitude: 41.0255, longitude: 29.0087, address: 'Üsküdar' },
    { latitude: 41.0431, longitude: 29.0088, address: 'Beşiktaş' },
  ];

  const imported = (title = 'From Google Maps') =>
    reducer(undefined, localRouteImported({ title, stops }));

  it('lands the whole route in one route', () => {
    const state = imported();

    expect(state.routes).toHaveLength(1);
    expect(state.routes[0].stops).toHaveLength(3);
  });

  it('keeps the stops in the order they arrived', () => {
    const state = imported();

    expect(state.routes[0].stops.map((point) => point.address)).toEqual([
      'Kadıköy',
      'Üsküdar',
      'Beşiktaş',
    ]);
  });

  it('ranks them densely from one, as every other writer does', () => {
    expect(imported().routes[0].stops.map((point) => point.order)).toEqual([
      1, 2, 3,
    ]);
  });

  it('gives every stop its own id', () => {
    const ids = imported().routes[0].stops.map((point) => point.id);

    expect(new Set(ids).size).toBe(3);
  });

  it('makes the imported route the active one, since that is the point', () => {
    const state = imported();

    expect(state.activeRouteId).toBe(state.routes[0].id);
  });

  it('puts it in front of what was already there, without disturbing it', () => {
    const existing = reducer(undefined, localRouteCreated('Trip'));

    const state = reducer(existing, localRouteImported({ title: 'X', stops }));

    expect(state.routes).toHaveLength(2);
    expect(state.routes[1].title).toBe('Trip');
  });

  it('takes the title it was given', () => {
    expect(imported('Coastal ride').routes[0].title).toBe('Coastal ride');
  });

  it('accepts a route with no stops rather than throwing', () => {
    const state = reducer(undefined, localRouteImported({ title: 'X', stops: [] }));

    expect(state.routes[0].stops).toEqual([]);
  });
});
