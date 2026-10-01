import { AreaBounds, AreaKind, MarkedArea } from 'types/travel-map';
import {
  areNeighbours,
  CITY_COLOR_COUNT,
  cityOf,
  groupByCity,
  pickColorSlot,
  previewColorSlot,
  withColorSlots,
} from './travelCities';

const box = (latitude: number, longitude: number, half = 0.2): AreaBounds => ({
  north: latitude + half,
  south: latitude - half,
  east: longitude + half,
  west: longitude - half,
});

let clock = 0;
const nextMoment = () =>
  new Date(Date.UTC(2026, 0, 1) + (clock += 1) * 60_000).toISOString();

const area = (
  placeId: string,
  {
    kind = 'district',
    city,
    countryCode = 'TR',
    latitude = 41,
    longitude = 29,
    half = 0.05,
    markedAt = nextMoment(),
    colorSlot,
  }: {
    kind?: AreaKind;
    city?: string | null;
    countryCode?: string | null;
    latitude?: number;
    longitude?: number;
    half?: number;
    markedAt?: string;
    colorSlot?: number;
  } = {},
): MarkedArea => ({
  placeId,
  name: placeId,
  address: placeId,
  kind,
  latitude,
  longitude,
  bounds: box(latitude, longitude, half),
  markedAt,
  ...(city === undefined ? {} : { city, countryCode }),
  ...(colorSlot === undefined ? {} : { colorSlot }),
});

// Far apart from one another: no two of these are neighbours.
const ISTANBUL = { latitude: 41.0, longitude: 29.0 };
const ANKARA = { latitude: 39.9, longitude: 32.8 };
const IZMIR = { latitude: 38.4, longitude: 27.1 };
const TRABZON = { latitude: 41.0, longitude: 39.7 };
const VAN = { latitude: 38.5, longitude: 43.4 };
// Right next to İstanbul.
const KOCAELI = { latitude: 40.85, longitude: 29.9 };

describe('cityOf', () => {
  it('takes the city the server named', () => {
    expect(
      cityOf(area('kadikoy', { city: 'İstanbul', ...ISTANBUL })),
    ).toEqual({ key: 'istanbul@TR', name: 'İstanbul' });
  });

  it('puts a country in no city', () => {
    expect(
      cityOf(area('turkiye', { kind: 'country', city: null })),
    ).toBeNull();
  });

  it('believes the server when it says an area is in no city', () => {
    expect(cityOf(area('ranch', { kind: 'place', city: null }))).toBeNull();
  });

  describe('for an area saved before areas carried their city', () => {
    it('makes an old city its own', () => {
      expect(cityOf(area('Ankara', { kind: 'city', ...ANKARA }))).toEqual({
        key: 'ankara',
        name: 'Ankara',
      });
    });

    it('puts an old district in the marked city around it', () => {
      const city = area('İstanbul', { kind: 'region', ...ISTANBUL, half: 1 });
      const district = area('Kadıköy', { ...ISTANBUL });

      expect(cityOf(district, [city, district])).toEqual({
        key: 'istanbul',
        name: 'İstanbul',
      });
    });

    it('prefers the closest fit when areas are nested', () => {
      const region = area('Marmara', { kind: 'region', ...ISTANBUL, half: 3 });
      const city = area('İstanbul', { kind: 'city', ...ISTANBUL, half: 1 });
      const place = area('Moda', { kind: 'place', ...ISTANBUL });

      expect(cityOf(place, [region, city, place])?.name).toBe('İstanbul');
    });

    it('leaves one with nothing around it in no city', () => {
      expect(cityOf(area('Moda', { kind: 'place' }), [])).toBeNull();
    });
  });
});

describe('groupByCity', () => {
  it('separates the map into its cities, newest first', () => {
    const { cities, elsewhere } = groupByCity([
      area('cankaya', { city: 'Ankara', ...ANKARA, markedAt: '2026-03-01' }),
      area('kadikoy', { city: 'İstanbul', ...ISTANBUL, markedAt: '2026-02-01' }),
      area('besiktas', { city: 'İstanbul', ...ISTANBUL, markedAt: '2026-01-01' }),
      area('turkiye', { kind: 'country', city: null, markedAt: '2026-01-02' }),
    ]);

    expect(
      cities.map(({ name, areas }) => [name, areas.map((a) => a.placeId)]),
    ).toEqual([
      ['Ankara', ['cankaya']],
      ['İstanbul', ['kadikoy', 'besiktas']],
    ]);
    expect(elsewhere.map(({ placeId }) => placeId)).toEqual(['turkiye']);
  });

  it('treats spellings of the same city as one', () => {
    const { cities } = groupByCity([
      area('a', { city: 'İstanbul', ...ISTANBUL }),
      area('b', { city: 'Istanbul', ...ISTANBUL }),
      area('c', { city: 'ISTANBUL', ...ISTANBUL }),
    ]);

    expect(cities).toHaveLength(1);
  });

  it('keeps apart two cities that share a name in different countries', () => {
    const { cities } = groupByCity([
      area('paris-fr', { city: 'Paris', countryCode: 'FR' }),
      area('paris-us', { city: 'Paris', countryCode: 'US' }),
    ]);

    expect(cities).toHaveLength(2);
  });

  it('files an old city under the same city marked since, by its server name', () => {
    const { cities } = groupByCity([
      area('Istanbul', { kind: 'city', ...ISTANBUL }),
      area('kadikoy', { city: 'İstanbul', ...ISTANBUL }),
    ]);

    expect(cities).toHaveLength(1);
    expect(cities[0].name).toBe('İstanbul');
  });

  it('draws a box around everything in a city', () => {
    const { cities } = groupByCity([
      area('west', { city: 'İstanbul', latitude: 41, longitude: 28.5 }),
      area('east', { city: 'İstanbul', latitude: 41, longitude: 29.5 }),
    ]);

    expect(cities[0].bounds.west).toBeCloseTo(28.45);
    expect(cities[0].bounds.east).toBeCloseTo(29.55);
  });
});

describe('areNeighbours', () => {
  it('counts cities whose areas touch, or nearly do, as neighbours', () => {
    expect(areNeighbours(box(41, 29), box(40.85, 29.9))).toBe(true);
  });

  it('does not count cities hundreds of kilometres apart', () => {
    expect(areNeighbours(box(41, 29), box(39.9, 32.8))).toBe(false);
  });

  it('sees across the 180th meridian', () => {
    const fijiWest = { north: -16, south: -17, east: 179.9, west: 179.5 };
    const fijiEast = { north: -16, south: -17, east: -179.6, west: -179.9 };

    expect(areNeighbours(fijiWest, fijiEast)).toBe(true);
  });
});

describe('pickColorSlot', () => {
  it('gives the first cities a colour each', () => {
    const placed: { bounds: AreaBounds; colorSlot: number }[] = [];

    for (const city of [ISTANBUL, ANKARA, IZMIR, TRABZON]) {
      const bounds = box(city.latitude, city.longitude);
      placed.push({ bounds, colorSlot: pickColorSlot(bounds, placed) });
    }

    expect(new Set(placed.map(({ colorSlot }) => colorSlot)).size).toBe(
      CITY_COLOR_COUNT,
    );
  });

  it('never gives a city the colour of a neighbour', () => {
    const istanbul = { bounds: box(ISTANBUL.latitude, ISTANBUL.longitude), colorSlot: 0 };
    const ankara = { bounds: box(ANKARA.latitude, ANKARA.longitude), colorSlot: 1 };
    const izmir = { bounds: box(IZMIR.latitude, IZMIR.longitude), colorSlot: 2 };
    const trabzon = { bounds: box(TRABZON.latitude, TRABZON.longitude), colorSlot: 3 };

    // Every colour is in use once; Kocaeli borders only İstanbul.
    expect(
      pickColorSlot(box(KOCAELI.latitude, KOCAELI.longitude), [
        istanbul,
        ankara,
        izmir,
        trabzon,
      ]),
    ).not.toBe(0);
  });

  it('reuses a colour only for a city far from everything wearing it', () => {
    const placed = [ISTANBUL, ANKARA, IZMIR, TRABZON].map((city, slot) => ({
      bounds: box(city.latitude, city.longitude),
      colorSlot: slot,
    }));

    const slot = pickColorSlot(box(VAN.latitude, VAN.longitude), placed);

    expect(slot).toBeGreaterThanOrEqual(0);
    expect(slot).toBeLessThan(CITY_COLOR_COUNT);
  });
});

describe('withColorSlots', () => {
  const map = () => [
    area('cankaya', { city: 'Ankara', ...ANKARA, markedAt: '2026-01-03' }),
    area('kadikoy', { city: 'İstanbul', ...ISTANBUL, markedAt: '2026-01-02' }),
    area('besiktas', { city: 'İstanbul', ...ISTANBUL, markedAt: '2026-01-01' }),
    area('turkiye', { kind: 'country', city: null, markedAt: '2026-01-04' }),
  ];

  it('dresses every area of a city in the same colour', () => {
    const coloured = withColorSlots(map());
    const slotOf = (id: string) =>
      coloured.find(({ placeId }) => placeId === id)?.colorSlot;

    expect(slotOf('kadikoy')).toBe(slotOf('besiktas'));
    expect(slotOf('kadikoy')).not.toBe(slotOf('cankaya'));
  });

  it('colours cities in the order they were first marked', () => {
    const coloured = withColorSlots(map());

    expect(
      coloured.find(({ placeId }) => placeId === 'besiktas')?.colorSlot,
    ).toBe(0);
  });

  it('leaves an area in no city uncoloured', () => {
    expect(
      withColorSlots(map()).find(({ placeId }) => placeId === 'turkiye'),
    ).not.toHaveProperty('colorSlot');
  });

  it('keeps every colour a city already wears when another city leaves', () => {
    const coloured = withColorSlots(map());
    const ankaraBefore = coloured.find(
      ({ placeId }) => placeId === 'cankaya',
    )?.colorSlot;

    const withoutIstanbul = withColorSlots(
      coloured.filter(({ city }) => city !== 'İstanbul'),
    );

    expect(
      withoutIstanbul.find(({ placeId }) => placeId === 'cankaya')?.colorSlot,
    ).toBe(ankaraBefore);
  });

  it('gives a newly marked area of a known city that city’s colour', () => {
    const coloured = withColorSlots(map());
    const istanbul = coloured.find(({ placeId }) => placeId === 'kadikoy');

    const next = withColorSlots([
      area('uskudar', { city: 'İstanbul', ...ISTANBUL }),
      ...coloured,
    ]);

    expect(next[0].colorSlot).toBe(istanbul?.colorSlot);
  });

  it('comes to the same answer every time for the same map', () => {
    expect(withColorSlots(map())).toEqual(withColorSlots(map()));
  });

  it('returns the very same objects when there is nothing to change', () => {
    const coloured = withColorSlots(map());

    withColorSlots(coloured).forEach((area, index) => {
      expect(area).toBe(coloured[index]);
    });
  });
});

describe('previewColorSlot', () => {
  it('shows a place in a city on the map in that city’s colour', () => {
    const coloured = withColorSlots([
      area('kadikoy', { city: 'İstanbul', ...ISTANBUL }),
    ]);

    expect(
      previewColorSlot(area('moda', { city: 'İstanbul', ...ISTANBUL }), coloured),
    ).toBe(coloured[0].colorSlot);
  });

  it('shows a new city in a colour none of its neighbours wear', () => {
    const coloured = withColorSlots([
      area('kadikoy', { city: 'İstanbul', ...ISTANBUL }),
    ]);

    expect(
      previewColorSlot(area('gebze', { city: 'Kocaeli', ...KOCAELI }), coloured),
    ).not.toBe(coloured[0].colorSlot);
  });

  it('shows a marked area in the colour it already wears', () => {
    const coloured = withColorSlots([
      area('kadikoy', { city: 'İstanbul', ...ISTANBUL, colorSlot: 3 }),
    ]);

    expect(previewColorSlot(coloured[0], coloured)).toBe(3);
  });

  it('has no colour for an area in no city', () => {
    expect(
      previewColorSlot(area('turkiye', { kind: 'country', city: null }), []),
    ).toBeNull();
  });
});
