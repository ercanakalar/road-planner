import {
  areaFill,
  areaStroke,
  cityColor,
  summarisedCounts,
  AREA_FILL_OPACITY,
  AREA_KIND_ICON,
  AREA_KIND_LABEL,
  CITY_COLORS,
  COUNTRY_FILL_OPACITY,
  widestFirst,
} from './travelMap';
import { lightColors, darkColors } from 'theme';
import { AREA_KINDS, AreaKind, MarkedArea } from 'types/travel-map';
import { CITY_COLOR_COUNT } from 'utils/travelCities';

const marked = (placeId: string, kind: AreaKind): MarkedArea => ({
  placeId,
  name: placeId,
  address: placeId,
  kind,
  latitude: 0,
  longitude: 0,
  bounds: { north: 1, south: -1, east: 1, west: -1 },
  markedAt: '2026-01-01T00:00:00.000Z',
});

describe('widestFirst', () => {
  it('draws a country under the city inside it', () => {
    const order = widestFirst([
      marked('a-place', 'place'),
      marked('a-country', 'country'),
      marked('a-city', 'city'),
    ]).map(({ kind }) => kind);

    expect(order).toEqual(['country', 'city', 'place']);
  });

  it('leaves the list it was given alone', () => {
    const areas = [marked('a-place', 'place'), marked('a-country', 'country')];

    widestFirst(areas);

    expect(areas.map(({ kind }) => kind)).toEqual(['place', 'country']);
  });

  it('handles a map with nothing on it', () => {
    expect(widestFirst([])).toEqual([]);
  });
});

describe('area colours', () => {
  const opacityOf = (color: string) =>
    Number(/rgba\(.+, (.+)\)$/.exec(color)?.[1]);

  it.each(AREA_KINDS.filter((kind) => kind !== 'country'))(
    'shades a %s with something the map reads through',
    (kind) => {
      expect(opacityOf(areaFill('#2a78d6', kind))).toBe(AREA_FILL_OPACITY);
    },
  );

  it('washes a country so lightly that the cities inside it still show', () => {
    expect(opacityOf(areaFill('#2a78d6', 'country'))).toBe(
      COUNTRY_FILL_OPACITY,
    );
    expect(COUNTRY_FILL_OPACITY).toBeLessThan(AREA_FILL_OPACITY);
  });

  it('draws the outline more strongly than the fill', () => {
    expect(opacityOf(areaStroke('#2a78d6'))).toBeGreaterThan(
      opacityOf(areaFill('#2a78d6', 'city')),
    );
  });

  it('has an icon and a word to call every size of place by', () => {
    AREA_KINDS.forEach((kind) => {
      expect(AREA_KIND_ICON[kind]).toBeTruthy();
      expect(AREA_KIND_LABEL[kind]).toMatch(/^travelMap\./);
    });
  });
});

describe('city colours', () => {
  it.each(['light', 'dark'] as const)(
    'has a distinct shade of every city colour in %s',
    (scheme) => {
      expect(CITY_COLORS[scheme]).toHaveLength(CITY_COLOR_COUNT);
      expect(new Set(CITY_COLORS[scheme]).size).toBe(CITY_COLOR_COUNT);
    },
  );

  it('picks the shade for the scheme the map is drawn in', () => {
    expect(cityColor(lightColors, 'light', 0)).toBe(CITY_COLORS.light[0]);
    expect(cityColor(darkColors, 'dark', 0)).toBe(CITY_COLORS.dark[0]);
  });

  it('draws an area in no city in neutral ink, never a city colour', () => {
    expect(cityColor(lightColors, 'light', null)).toBe(lightColors.textMuted);
    expect(cityColor(darkColors, 'dark', undefined)).toBe(darkColors.textMuted);
    expect(CITY_COLORS.light).not.toContain(lightColors.textMuted);
  });

  it('stays on the palette for a colour from a larger palette of old', () => {
    expect(CITY_COLORS.light).toContain(
      cityColor(lightColors, 'light', CITY_COLOR_COUNT + 1),
    );
  });
});

describe('summarisedCounts', () => {
  it('counts the countries and the cities, widest first', () => {
    expect(
      summarisedCounts([
        marked('a', 'city'),
        marked('b', 'country'),
        marked('c', 'city'),
      ]),
    ).toEqual([
      { key: 'travelMap.countries', count: 1 },
      { key: 'travelMap.cities', count: 2 },
    ]);
  });

  it('leaves out a size nothing has been marked at', () => {
    expect(summarisedCounts([marked('a', 'country')])).toEqual([
      { key: 'travelMap.countries', count: 1 },
    ]);
  });

  it('counts nothing on a map of districts and single places', () => {
    expect(
      summarisedCounts([marked('a', 'district'), marked('b', 'place')]),
    ).toEqual([]);
  });

  it('counts nothing on an empty map', () => {
    expect(summarisedCounts([])).toEqual([]);
  });

  it('counts a city once, however many of its districts are marked', () => {
    const inIstanbul = (placeId: string): MarkedArea => ({
      ...marked(placeId, 'district'),
      city: 'İstanbul',
      countryCode: 'TR',
    });

    expect(
      summarisedCounts([inIstanbul('kadikoy'), inIstanbul('besiktas')]),
    ).toEqual([{ key: 'travelMap.cities', count: 1 }]);
  });
});
