import reducer, {
  areaMarked,
  areaUnmarked,
  travelAreasHydrated,
  travelMapCleared,
  travelMapInitialState,
} from './travelMapSlice';
import { MapArea, MarkedArea } from 'types/travel-map';

const area = (placeId: string, name = placeId): MapArea => ({
  placeId,
  name,
  address: `${name}, Türkiye`,
  kind: 'city',
  latitude: 38.42,
  longitude: 27.14,
  bounds: { north: 38.6, south: 38.2, east: 27.4, west: 26.9 },
});

const marked = (placeId: string, markedAt: string): MarkedArea => ({
  ...area(placeId),
  markedAt,
});

describe('travelMapSlice', () => {
  it('starts with nothing marked and nothing read back yet', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual(travelMapInitialState);
  });

  it('takes the places read back off the device', () => {
    const stored = [marked('izmir', '2026-01-01T00:00:00.000Z')];

    const state = reducer(undefined, travelAreasHydrated(stored));

    expect(state.areas).toEqual(stored);
    expect(state.isHydrated).toBe(true);
  });

  it('is hydrated even when the device had nothing on it', () => {
    expect(reducer(undefined, travelAreasHydrated([])).isHydrated).toBe(true);
  });

  it('puts a newly marked place at the top', () => {
    const state = reducer(
      { areas: [marked('izmir', '2026-01-01T00:00:00.000Z')], isHydrated: true },
      areaMarked(area('ankara')),
    );

    expect(state.areas.map(({ placeId }) => placeId)).toEqual([
      'ankara',
      'izmir',
    ]);
  });

  it('stamps a marked place with the moment it was marked', () => {
    const state = reducer(undefined, areaMarked(area('izmir')));

    expect(Date.parse(state.areas[0].markedAt)).not.toBeNaN();
  });

  it('holds a place once, however often it is marked', () => {
    const first = reducer(undefined, areaMarked(area('izmir')));
    const second = reducer(first, areaMarked(area('izmir', 'İzmir')));

    expect(second.areas).toHaveLength(1);
    expect(second.areas[0].name).toBe('İzmir');
  });

  it('forgets the place that was unmarked and leaves the rest', () => {
    const state = reducer(
      {
        areas: [
          marked('izmir', '2026-01-02T00:00:00.000Z'),
          marked('ankara', '2026-01-01T00:00:00.000Z'),
        ],
        isHydrated: true,
      },
      areaUnmarked('izmir'),
    );

    expect(state.areas.map(({ placeId }) => placeId)).toEqual(['ankara']);
  });

  it('ignores an unmark for a place that is not on the map', () => {
    const areas = [marked('izmir', '2026-01-01T00:00:00.000Z')];

    expect(reducer({ areas, isHydrated: true }, areaUnmarked('gone')).areas)
      .toEqual(areas);
  });

  it('empties the map without forgetting it has been read', () => {
    const state = reducer(
      { areas: [marked('izmir', '2026-01-01T00:00:00.000Z')], isHydrated: true },
      travelMapCleared(),
    );

    expect(state).toEqual({ areas: [], isHydrated: true });
  });
});
