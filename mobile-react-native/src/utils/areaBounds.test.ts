import {
  boundsCorners,
  boundsToPolygon,
  boundsToRegion,
  wrapLongitude,
} from './areaBounds';

const IZMIR = { north: 38.6, south: 38.2, east: 27.4, west: 26.9 };

const FIJI = { north: -12.4, south: -21.0, east: -178.2, west: 176.8 };

describe('boundsToPolygon', () => {
  it('starts and ends on the same edge, so the ring closes itself', () => {
    const ring = boundsToPolygon(IZMIR);

    expect(ring[0]).toEqual({ latitude: 38.6, longitude: 26.9 });
    expect(ring[ring.length - 1]).toEqual({ latitude: 38.2, longitude: 26.9 });
  });

  it('covers the whole box and nothing outside it', () => {
    const ring = boundsToPolygon(IZMIR);

    expect(Math.min(...ring.map(({ latitude }) => latitude))).toBeCloseTo(38.2);
    expect(Math.max(...ring.map(({ latitude }) => latitude))).toBeCloseTo(38.6);
    expect(Math.min(...ring.map(({ longitude }) => longitude))).toBeCloseTo(26.9);
    expect(Math.max(...ring.map(({ longitude }) => longitude))).toBeCloseTo(27.4);
  });

  it('walks a wide edge in steps, so it stays flat on both platforms', () => {
    const turkey = { north: 42.1, south: 35.8, east: 44.8, west: 25.6 };

    const north = boundsToPolygon(turkey).filter(
      ({ latitude }) => latitude === turkey.north,
    );

    expect(north.length).toBeGreaterThan(2);
    expect(new Set(north.map(({ latitude }) => latitude)).size).toBe(1);
  });

  it('closes a box that crosses the 180th meridian the short way round', () => {
    const longitudes = boundsToPolygon(FIJI).map(({ longitude }) => longitude);

    expect(Math.min(...longitudes)).toBeCloseTo(176.8);
    expect(Math.max(...longitudes)).toBeCloseTo(181.8);
  });
});

describe('boundsCorners', () => {
  it('gives the four corners of the box', () => {
    expect(boundsCorners(IZMIR)).toEqual([
      { latitude: 38.6, longitude: 26.9 },
      { latitude: 38.6, longitude: 27.4 },
      { latitude: 38.2, longitude: 27.4 },
      { latitude: 38.2, longitude: 26.9 },
    ]);
  });

  it('leaves a box across the meridian for the map to close', () => {
    const longitudes = boundsCorners(FIJI).map(({ longitude }) => longitude);

    expect(Math.max(...longitudes)).toBeLessThanOrEqual(180);
    expect(Math.min(...longitudes)).toBeGreaterThanOrEqual(-180);
    expect(longitudes).toContain(-178.2);
  });
});

describe('boundsToRegion', () => {
  it('centres on the box', () => {
    const region = boundsToRegion(IZMIR);

    expect(region.latitude).toBeCloseTo(38.4);
    expect(region.longitude).toBeCloseTo(27.15);
  });

  it('leaves air around the place rather than framing it edge to edge', () => {
    const region = boundsToRegion(IZMIR);

    expect(region.latitudeDelta).toBeGreaterThan(IZMIR.north - IZMIR.south);
    expect(region.longitudeDelta).toBeGreaterThan(IZMIR.east - IZMIR.west);
  });

  it('frames a pin close enough to see, rather than at no zoom at all', () => {
    const pin = { north: 38.4, south: 38.4, east: 27.1, west: 27.1 };

    expect(boundsToRegion(pin).latitudeDelta).toBeGreaterThan(0);
    expect(boundsToRegion(pin).longitudeDelta).toBeGreaterThan(0);
  });

  it('centres a box crossing the 180th meridian on the meridian itself', () => {
    const region = boundsToRegion(FIJI);

    expect(region.longitude).toBeCloseTo(179.3);
    expect(region.longitudeDelta).toBeLessThan(10);
  });

  it('never asks the camera for more than one world', () => {
    const everywhere = { north: 85, south: -85, east: 180, west: -180 };
    const region = boundsToRegion(everywhere);

    expect(region.latitudeDelta).toBeLessThanOrEqual(180);
    expect(region.longitudeDelta).toBeLessThanOrEqual(360);
  });
});

describe('wrapLongitude', () => {
  it.each([
    [181.8, -178.2],
    [-181.8, 178.2],
    [541.8, -178.2],
  ])('brings %p back inside the world as %p', (longitude, expected) => {
    expect(wrapLongitude(longitude)).toBeCloseTo(expected);
  });

  it.each([27.1, -178.2, 180, -180])(
    'hands %p back untouched, since it is already a longitude',
    (longitude) => {
      expect(wrapLongitude(longitude)).toBe(longitude);
    },
  );
});
