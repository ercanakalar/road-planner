import {
  areaColor,
  areaFill,
  areaStroke,
  summarisedCounts,
  AREA_FILL_OPACITY,
  AREA_KIND_ICON,
  AREA_KIND_LABEL,
  widestFirst,
} from './travelMap';
import { lightColors, darkColors } from 'theme';
import { AREA_KINDS, AreaKind, MarkedArea } from 'types/travel-map';

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
    // Last drawn is on top, so the smallest place has to come last or it is
    // buried under everything it sits inside.
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

  it.each(AREA_KINDS)(
    'shades a %s with something the map reads through',
    (kind) => {
      expect(opacityOf(areaFill(lightColors, kind))).toBe(AREA_FILL_OPACITY);
    },
  );

  it('draws the outline more strongly than the fill', () => {
    // The fill all but disappears over a busy map; the outline carries the shape.
    expect(opacityOf(areaStroke(lightColors, 'city'))).toBeGreaterThan(
      opacityOf(areaFill(lightColors, 'city')),
    );
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('gives every size of place its own hue in %s', (_scheme, colors) => {
    const used = AREA_KINDS.map((kind) => areaColor(colors, kind));

    expect(new Set(used).size).toBe(AREA_KINDS.length);
  });

  it('has an icon and a word to call every size of place by', () => {
    AREA_KINDS.forEach((kind) => {
      expect(AREA_KIND_ICON[kind]).toBeTruthy();
      expect(AREA_KIND_LABEL[kind]).toMatch(/^travelMap\./);
    });
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
    // The card says "4 places coloured in" instead, which is the true total.
    expect(
      summarisedCounts([marked('a', 'district'), marked('b', 'place')]),
    ).toEqual([]);
  });

  it('counts nothing on an empty map', () => {
    expect(summarisedCounts([])).toEqual([]);
  });
});
