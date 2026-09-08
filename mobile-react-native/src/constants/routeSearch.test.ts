import {
  DEFAULT_ROUTE_LENGTH,
  DEFAULT_ROUTE_SEARCH_ORDER,
  routeLengthFilters,
  routeSearchOrders,
} from './routeSearch';

describe('route search orders', () => {
  it('offers the default as one of the choices', () => {
    expect(routeSearchOrders.map((option) => option.key)).toContain(
      DEFAULT_ROUTE_SEARCH_ORDER,
    );
  });

  it('has no duplicate keys, which would make two chips look selected', () => {
    const keys = routeSearchOrders.map((option) => option.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('route length filters', () => {
  it('offers the default as one of the choices', () => {
    expect(routeLengthFilters.map((option) => option.key)).toContain(
      DEFAULT_ROUTE_LENGTH,
    );
  });

  it('leaves the default band unbounded, so it filters nothing', () => {
    const band = routeLengthFilters.find(
      (option) => option.key === DEFAULT_ROUTE_LENGTH,
    );

    expect(band?.minStops).toBeUndefined();
    expect(band?.maxStops).toBeUndefined();
  });

  it('covers every stop count from two upwards with no gap', () => {
    // A gap would make a route unreachable through any filter.
    const bands = routeLengthFilters
      .filter((option) => option.minStops !== undefined)
      .sort((a, b) => (a.minStops ?? 0) - (b.minStops ?? 0));

    bands.forEach((band, index) => {
      const next = bands[index + 1];
      if (!next) {
        expect(band.maxStops).toBeUndefined();
        return;
      }
      expect(next.minStops).toBe((band.maxStops ?? 0) + 1);
    });
  });

  it('never lets a band end before it starts', () => {
    routeLengthFilters.forEach((band) => {
      if (band.minStops !== undefined && band.maxStops !== undefined) {
        expect(band.maxStops).toBeGreaterThanOrEqual(band.minStops);
      }
    });
  });
});
