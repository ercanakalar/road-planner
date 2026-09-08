import {
  buildGoogleMapsRouteUrl,
  GOOGLE_MAPS_STOP_LIMIT,
} from './googleMapsLink';

const stop = (latitude: number, longitude = 29) => ({ latitude, longitude });

const paramsOf = (url: string) => new URLSearchParams(url.split('?')[1]);

describe('buildGoogleMapsRouteUrl', () => {
  it('has nothing to open for a route without stops', () => {
    expect(buildGoogleMapsRouteUrl([])).toBeNull();
  });

  it('sends a lone stop as a destination, so Google starts from the phone', () => {
    const link = buildGoogleMapsRouteUrl([stop(41)]);
    const params = paramsOf(link!.url);

    expect(params.get('destination')).toBe('41.000000,29.000000');
    expect(params.get('origin')).toBeNull();
    expect(params.get('waypoints')).toBeNull();
    expect(link!.includedCount).toBe(1);
  });

  it('makes the ends the origin and the destination', () => {
    const link = buildGoogleMapsRouteUrl([stop(41), stop(42), stop(43)]);
    const params = paramsOf(link!.url);

    expect(params.get('origin')).toBe('41.000000,29.000000');
    expect(params.get('destination')).toBe('43.000000,29.000000');
    expect(params.get('waypoints')).toBe('42.000000,29.000000');
    expect(link!.omittedCount).toBe(0);
  });

  it('opens the maps app rather than a page it would have to route through', () => {
    const link = buildGoogleMapsRouteUrl([stop(41), stop(42)]);

    expect(link!.url.startsWith('https://www.google.com/maps/dir/?')).toBe(true);
    expect(paramsOf(link!.url).get('api')).toBe('1');
  });

  it.each(['walking', 'driving', 'transit'] as const)(
    'carries the %s mode over',
    (mode) => {
      const link = buildGoogleMapsRouteUrl([stop(41), stop(42)], mode);

      expect(paramsOf(link!.url).get('travelmode')).toBe(mode);
    },
  );

  it('separates several waypoints with a pipe', () => {
    const link = buildGoogleMapsRouteUrl([41, 42, 43, 44].map((lat) => stop(lat)));

    expect(paramsOf(link!.url).get('waypoints')).toBe(
      '42.000000,29.000000|43.000000,29.000000',
    );
  });

  describe('a route longer than Google carries', () => {
    // Thirteen stops: eleven of them between the ends, two more than fit.
    const stops = Array.from({ length: 13 }, (_, index) => stop(41 + index));
    const link = buildGoogleMapsRouteUrl(stops)!;
    const waypoints = paramsOf(link.url).get('waypoints')!.split('|');

    it('thins the middle down to what Google accepts', () => {
      expect(waypoints).toHaveLength(GOOGLE_MAPS_STOP_LIMIT);
    });

    it('keeps the ends the user chose', () => {
      const params = paramsOf(link.url);

      expect(params.get('origin')).toBe('41.000000,29.000000');
      expect(params.get('destination')).toBe('53.000000,29.000000');
    });

    it('spreads what it keeps over the whole route', () => {
      expect(waypoints[0]).toBe('42.000000,29.000000');
      expect(waypoints[waypoints.length - 1]).toBe('52.000000,29.000000');
    });

    it('says how many stops did not make it', () => {
      expect(link.includedCount).toBe(GOOGLE_MAPS_STOP_LIMIT + 2);
      expect(link.omittedCount).toBe(2);
    });
  });
});
