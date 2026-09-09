import { haversineMeters, splitRouteAtLocation } from './geo';

const DEGREE_METERS = 111194.93;

const ROUTE = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.05, longitude: 0 },
  { latitude: 0.1, longitude: 0 },
];

const last = <T>(items: T[]): T => items[items.length - 1];

describe('haversineMeters', () => {
  it('measures a known distance', () => {
    expect(
      haversineMeters(
        { latitude: 41.0082, longitude: 28.9784 },
        { latitude: 39.9334, longitude: 32.8597 },
      ),
    ).toBeCloseTo(349_400, -3);
  });

  it('is zero between a point and itself', () => {
    expect(haversineMeters(ROUTE[0], ROUTE[0])).toBe(0);
  });

  it('takes the short way across the antimeridian', () => {
    expect(
      haversineMeters(
        { latitude: 0, longitude: -179.95 },
        { latitude: 0, longitude: 179.95 },
      ),
    ).toBeCloseTo(0.1 * DEGREE_METERS, -1);
  });
});

describe('splitRouteAtLocation', () => {
  it('cuts the line at the point nearest the position', () => {
    const split = splitRouteAtLocation(ROUTE, {
      latitude: 0.03,
      longitude: 0,
    });

    expect(last(split!.travelled).latitude).toBeCloseTo(0.03, 5);
    expect(split!.remaining[0].latitude).toBeCloseTo(0.03, 5);
  });

  it('leaves the two halves meeting at the cut, with no gap', () => {
    const split = splitRouteAtLocation(ROUTE, {
      latitude: 0.07,
      longitude: 0,
    });

    expect(last(split!.travelled)).toEqual(split!.remaining[0]);
  });

  it('keeps the route already driven behind the cut', () => {
    const split = splitRouteAtLocation(ROUTE, {
      latitude: 0.07,
      longitude: 0,
    });

    expect(split!.travelled).toHaveLength(3);
    expect(split!.travelled.slice(0, 2)).toEqual([ROUTE[0], ROUTE[1]]);
    expect(last(split!.travelled).latitude).toBeCloseTo(0.07, 5);
  });

  it('keeps the route still ahead in front of it', () => {
    const split = splitRouteAtLocation(ROUTE, {
      latitude: 0.02,
      longitude: 0,
    });

    expect(split!.remaining).toHaveLength(3);
    expect(split!.remaining[0].latitude).toBeCloseTo(0.02, 5);
    expect(split!.remaining.slice(1)).toEqual([ROUTE[1], ROUTE[2]]);
  });

  it('reports how far off the line the position is', () => {
    const split = splitRouteAtLocation(ROUTE, {
      latitude: 0.05,
      longitude: 0.001,
    });

    expect(split!.distanceFromRouteMeters).toBeCloseTo(
      0.001 * DEGREE_METERS,
      -1,
    );
  });

  it('is on the line when standing on it', () => {
    const split = splitRouteAtLocation(ROUTE, { latitude: 0.05, longitude: 0 });

    expect(split!.distanceFromRouteMeters).toBeCloseTo(0, 3);
  });

  it('has driven none of it at the start', () => {
    const split = splitRouteAtLocation(ROUTE, { latitude: 0, longitude: 0 });

    expect(split!.remaining).toEqual(ROUTE);
    expect(split!.travelled).toHaveLength(1);
  });

  it('has driven all of it at the end', () => {
    const split = splitRouteAtLocation(ROUTE, { latitude: 0.1, longitude: 0 });

    expect(split!.travelled).toEqual(ROUTE);
    expect(split!.remaining).toHaveLength(1);
  });

  it('cuts at the nearest stretch of a route that doubles back', () => {
    const hairpin = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.1, longitude: 0 },
      { latitude: 0.1, longitude: 0.1 },
    ];

    const split = splitRouteAtLocation(hairpin, {
      latitude: 0.099,
      longitude: 0.05,
    });

    expect(split!.travelled).toHaveLength(3);
    expect(last(split!.travelled).longitude).toBeCloseTo(0.05, 5);
  });

  it('measures a position nowhere near the route as nowhere near it', () => {
    const split = splitRouteAtLocation(ROUTE, { latitude: 0.05, longitude: 1 });

    expect(split!.distanceFromRouteMeters).toBeGreaterThan(100_000);
  });

  it('has nothing to cut when there is no line yet', () => {
    expect(splitRouteAtLocation([], ROUTE[0])).toBeNull();
    expect(splitRouteAtLocation([ROUTE[0]], ROUTE[0])).toBeNull();
  });
});
