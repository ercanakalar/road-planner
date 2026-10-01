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

    expect(state.areas).toEqual([{ ...stored[0], colorSlot: 0 }]);
    expect(state.isHydrated).toBe(true);
  });

  it('keeps the colour a city was stored with', () => {
    const stored = [{ ...marked('izmir', '2026-01-01T00:00:00.000Z'), colorSlot: 2 }];

    const state = reducer(undefined, travelAreasHydrated(stored));

    expect(state.areas[0].colorSlot).toBe(2);
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

  it('dresses a newly marked city in a colour of its own', () => {
    const first = reducer(undefined, areaMarked(area('izmir', 'İzmir')));
    const second = reducer(
      first,
      areaMarked({
        ...area('ankara', 'Ankara'),
        latitude: 39.9,
        longitude: 32.8,
        bounds: { north: 40.1, south: 39.7, east: 33, west: 32.6 },
      }),
    );

    const [ankara, izmir] = second.areas;
    expect(izmir.colorSlot).toBe(0);
    expect(ankara.colorSlot).toBeDefined();
    expect(ankara.colorSlot).not.toBe(izmir.colorSlot);
  });

  it('gives a place in a city already on the map that city’s colour', () => {
    const city = reducer(undefined, areaMarked(area('izmir', 'İzmir')));

    const withDistrict = reducer(
      city,
      areaMarked({
        ...area('konak', 'Konak'),
        kind: 'district',
        city: 'İzmir',
        countryCode: 'TR',
        bounds: { north: 38.45, south: 38.38, east: 27.17, west: 27.1 },
      }),
    );

    expect(withDistrict.areas.map(({ colorSlot }) => colorSlot)).toEqual([0, 0]);
  });

  it('does not let a caller choose the colour', () => {
    const state = reducer(
      undefined,
      areaMarked({ ...area('izmir'), colorSlot: 3 } as MapArea),
    );

    expect(state.areas[0].colorSlot).toBe(0);
  });

  it('keeps the other cities’ colours when one is unmarked', () => {
    const one = reducer(undefined, areaMarked(area('izmir', 'İzmir')));
    const two = reducer(
      one,
      areaMarked({
        ...area('ankara', 'Ankara'),
        latitude: 39.9,
        longitude: 32.8,
        bounds: { north: 40.1, south: 39.7, east: 33, west: 32.6 },
      }),
    );
    const ankaraSlot = two.areas.find(({ placeId }) => placeId === 'ankara')
      ?.colorSlot;

    const after = reducer(two, areaUnmarked('izmir'));

    expect(after.areas[0].colorSlot).toBe(ankaraSlot);
  });

  it('empties the map without forgetting it has been read', () => {
    const state = reducer(
      { areas: [marked('izmir', '2026-01-01T00:00:00.000Z')], isHydrated: true },
      travelMapCleared(),
    );

    expect(state).toEqual({ areas: [], isHydrated: true });
  });
});
