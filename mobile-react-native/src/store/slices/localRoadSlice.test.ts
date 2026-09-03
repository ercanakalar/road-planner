import reducer, {
  localRoadCreated,
  localRoadDeleted,
  localRoadUploadFinished,
  localRoadsHydrated,
  localWaypointAdded,
  localWaypointDeleted,
  localWaypointFavoriteToggled,
  localWaypointMoved,
  localWaypointsReordered,
  makeLocalRoad,
} from './localRoadSlice';
import { LocalRoad } from 'types/local-road';

const address = 'Somewhere, Fatih, İstanbul, TR';

const addPin = (state: ReturnType<typeof reducer>, latitude: number) =>
  reducer(state, localWaypointAdded({ latitude, longitude: 1, address }));

const roadWithPins = (count: number) => {
  let state = reducer(undefined, localRoadCreated('Trip'));
  for (let index = 0; index < count; index += 1) {
    state = addPin(state, index + 1);
  }
  return state;
};

describe('localRoadSlice', () => {
  it('hydrates from storage and selects the first route', () => {
    const stored: LocalRoad[] = [makeLocalRoad('A'), makeLocalRoad('B')];
    const state = reducer(undefined, localRoadsHydrated(stored));

    expect(state.roads).toHaveLength(2);
    expect(state.activeRoadId).toBe(stored[0].id);
    expect(state.isHydrated).toBe(true);
  });

  it('creates a route on the first pin so nothing has to be named first', () => {
    const state = addPin(reducer(undefined, localRoadsHydrated([])), 41);

    expect(state.roads).toHaveLength(1);
    expect(state.roads[0].wayPoints).toHaveLength(1);
    expect(state.activeRoadId).toBe(state.roads[0].id);
  });

  it('numbers stops from one as they are added', () => {
    const state = roadWithPins(3);
    expect(state.roads[0].wayPoints.map((w) => w.order)).toEqual([1, 2, 3]);
  });

  it('closes the gap in ordering after a delete', () => {
    const state = roadWithPins(3);
    const middleId = state.roads[0].wayPoints[1].id;
    const next = reducer(state, localWaypointDeleted(middleId));

    expect(next.roads[0].wayPoints.map((w) => w.order)).toEqual([1, 2]);
    expect(next.roads[0].wayPoints.map((w) => w.latitude)).toEqual([1, 3]);
  });

  it('renumbers after a reorder', () => {
    const state = roadWithPins(3);
    const next = reducer(state, localWaypointsReordered({ from: 2, to: 0 }));

    expect(next.roads[0].wayPoints.map((w) => w.latitude)).toEqual([3, 1, 2]);
    expect(next.roads[0].wayPoints.map((w) => w.order)).toEqual([1, 2, 3]);
  });

  it('ignores a reorder that does not move anything', () => {
    const state = roadWithPins(2);
    const next = reducer(state, localWaypointsReordered({ from: 1, to: 1 }));
    expect(next.roads[0].wayPoints).toEqual(state.roads[0].wayPoints);
  });

  it('moves a pin and keeps its new address', () => {
    const state = roadWithPins(1);
    const waypointId = state.roads[0].wayPoints[0].id;
    const moved = 'Elsewhere, Fatih, İstanbul, TR';

    const next = reducer(
      state,
      localWaypointMoved({
        waypointId,
        latitude: 50,
        longitude: 60,
        address: moved,
      }),
    );

    expect(next.roads[0].wayPoints[0]).toMatchObject({
      latitude: 50,
      longitude: 60,
      address: moved,
    });
  });

  it('picks another route when the active one is deleted', () => {
    const first = reducer(undefined, localRoadCreated('A'));
    const second = reducer(first, localRoadCreated('B'));
    const next = reducer(second, localRoadDeleted(second.activeRoadId!));

    expect(next.roads).toHaveLength(1);
    expect(next.activeRoadId).toBe(next.roads[0].id);
  });

  it('keeps routes that failed to upload', () => {
    const first = reducer(undefined, localRoadCreated('A'));
    const both = reducer(first, localRoadCreated('B'));
    const uploadedId = both.roads[0].id;

    const next = reducer(
      both,
      localRoadUploadFinished({ uploadedIds: [uploadedId] }),
    );

    expect(next.roads).toHaveLength(1);
    expect(next.roads[0].id).not.toBe(uploadedId);
    expect(next.isUploading).toBe(false);
    expect(next.activeRoadId).toBe(next.roads[0].id);
  });

  it('stars a stop on the device and unstars it again', () => {
    let state = roadWithPins(2);
    const [first] = state.roads[0].wayPoints;

    expect(first.isFavorite).toBeUndefined();

    state = reducer(state, localWaypointFavoriteToggled(first.id));
    expect(state.roads[0].wayPoints[0].isFavorite).toBe(true);
    expect(state.roads[0].wayPoints[1].isFavorite).toBeUndefined();

    state = reducer(state, localWaypointFavoriteToggled(first.id));
    expect(state.roads[0].wayPoints[0].isFavorite).toBe(false);
  });

  it('ignores a star for a stop that is not on the active route', () => {
    const state = roadWithPins(1);
    const next = reducer(state, localWaypointFavoriteToggled('wp-missing'));

    expect(next.roads[0].wayPoints[0].isFavorite).toBeUndefined();
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
      localWaypointAdded({
        latitude,
        longitude: 1,
        address,
        insertAtIndex: index,
      }),
    );

  it('drops the stop between the two it is passed between', () => {
    const state = insertAt(roadWithPins(2), 99, 1);

    expect(state.roads[0].wayPoints.map((point) => point.latitude)).toEqual([
      1, 99, 2,
    ]);
  });

  it('renumbers the stops it pushed along', () => {
    const state = insertAt(roadWithPins(3), 99, 1);

    expect(state.roads[0].wayPoints.map((point) => point.order)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('appends when no position is given, as a dropped pin does', () => {
    const state = addPin(roadWithPins(2), 99);

    expect(state.roads[0].wayPoints.map((point) => point.latitude)).toEqual([
      1, 2, 99,
    ]);
  });

  it('keeps a position past the end of the route inside it', () => {
    const state = insertAt(roadWithPins(2), 99, 9);

    expect(state.roads[0].wayPoints.map((point) => point.latitude)).toEqual([
      1, 2, 99,
    ]);
  });
});
