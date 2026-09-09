import {
  bearingDegrees,
  haversineMeters,
  pathLengthMeters,
  projectOntoPath,
  samplePath,
  turnDegrees,
} from './geo';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };

const DEGREE_METERS = 111194.93;

const MERIDIAN = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.1, longitude: 0 },
];

describe('haversineMeters', () => {
  it('measures a known distance', () => {
    expect(haversineMeters(ISTANBUL, ANKARA)).toBeCloseTo(349_400, -3);
  });

  it('is zero between a point and itself', () => {
    expect(haversineMeters(ISTANBUL, ISTANBUL)).toBe(0);
  });

  it('measures the same distance in either direction', () => {
    expect(haversineMeters(ISTANBUL, ANKARA)).toBeCloseTo(
      haversineMeters(ANKARA, ISTANBUL),
      6,
    );
  });

  it('takes the short way across the antimeridian', () => {
    const west = { latitude: 0, longitude: -179.95 };
    const east = { latitude: 0, longitude: 179.95 };

    expect(haversineMeters(west, east)).toBeCloseTo(0.1 * DEGREE_METERS, -1);
  });
});

describe('pathLengthMeters', () => {
  it('adds the segments up', () => {
    expect(pathLengthMeters(MERIDIAN)).toBeCloseTo(0.1 * DEGREE_METERS, -1);
  });

  it('is zero for a path that goes nowhere', () => {
    expect(pathLengthMeters([ISTANBUL])).toBe(0);
    expect(pathLengthMeters([])).toBe(0);
  });
});

describe('projectOntoPath', () => {
  it('measures the perpendicular distance to the line, not to its ends', () => {
    const beside = { latitude: 0.05, longitude: 0.01 };

    expect(projectOntoPath(beside, MERIDIAN)?.distanceMeters).toBeCloseTo(
      0.01 * DEGREE_METERS,
      -1,
    );
  });

  it('reports how far along the path the nearest point is', () => {
    const beside = { latitude: 0.05, longitude: 0.01 };

    expect(projectOntoPath(beside, MERIDIAN)?.alongMeters).toBeCloseTo(
      0.05 * DEGREE_METERS,
      -1,
    );
  });

  it('measures to the end of the path for a point past it', () => {
    const beyond = { latitude: 0.2, longitude: 0 };
    const projection = projectOntoPath(beyond, MERIDIAN);

    expect(projection?.distanceMeters).toBeCloseTo(0.1 * DEGREE_METERS, -1);
    expect(projection?.alongMeters).toBeCloseTo(0.1 * DEGREE_METERS, -1);
  });

  it('is zero for a point sitting on the line', () => {
    expect(
      projectOntoPath({ latitude: 0.07, longitude: 0 }, MERIDIAN)
        ?.distanceMeters,
    ).toBeCloseTo(0, 3);
  });

  it('picks the nearest segment of a path that doubles back', () => {
    const hairpin = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.1, longitude: 0 },
      { latitude: 0.1, longitude: 0.1 },
    ];

    const projection = projectOntoPath(
      { latitude: 0.099, longitude: 0.05 },
      hairpin,
    );

    expect(projection?.distanceMeters).toBeCloseTo(0.001 * DEGREE_METERS, -1);
    expect(projection?.alongMeters).toBeCloseTo(0.15 * DEGREE_METERS, -1);
  });

  it('has nothing to measure against an empty path', () => {
    expect(projectOntoPath(ISTANBUL, [])).toBeNull();
  });

  it('measures straight to the only point of a one-point path', () => {
    expect(projectOntoPath(ANKARA, [ISTANBUL])).toEqual({
      distanceMeters: haversineMeters(ANKARA, ISTANBUL),
      alongMeters: 0,
    });
  });
});

describe('samplePath', () => {
  it('starts and ends on the path', () => {
    const samples = samplePath(MERIDIAN, 3000);

    expect(samples[0]).toEqual(MERIDIAN[0]);
    expect(samples[samples.length - 1]).toEqual(MERIDIAN[1]);
  });

  it('leaves no gap wider than the spacing', () => {
    const spacing = 2500;
    const samples = samplePath(MERIDIAN, spacing);

    samples.slice(1).forEach((sample, index) => {
      expect(haversineMeters(samples[index], sample)).toBeLessThanOrEqual(
        spacing + 1,
      );
    });
  });

  it('spaces the samples out by the distance asked for', () => {
    const samples = samplePath(MERIDIAN, 0.02 * DEGREE_METERS);

    expect(samples).toHaveLength(6);
    expect(samples[1].latitude).toBeCloseTo(0.02, 4);
  });

  it('collapses to the two ends when the spacing covers the whole path', () => {
    expect(samplePath(MERIDIAN, 1_000_000)).toEqual(MERIDIAN);
  });

  it('samples across segment boundaries rather than restarting at each', () => {
    const path = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.01, longitude: 0 },
      { latitude: 0.02, longitude: 0 },
    ];

    const samples = samplePath(path, 0.015 * DEGREE_METERS);

    expect(samples).toHaveLength(3);
    expect(samples[1].latitude).toBeCloseTo(0.015, 4);
  });

  it('ignores a repeated point', () => {
    const repeated = [MERIDIAN[0], MERIDIAN[0], MERIDIAN[1]];

    expect(samplePath(repeated, 1_000_000)).toEqual(MERIDIAN);
  });

  it('has nothing to sample on an empty path', () => {
    expect(samplePath([], 1000)).toEqual([]);
  });
});

describe('bearingDegrees', () => {
  const ORIGIN = { latitude: 0, longitude: 0 };

  it.each([
    ['north', { latitude: 1, longitude: 0 }, 0],
    ['east', { latitude: 0, longitude: 1 }, 90],
    ['south', { latitude: -1, longitude: 0 }, 180],
    ['west', { latitude: 0, longitude: -1 }, 270],
  ])('points %s', (_name, to, expected) => {
    expect(bearingDegrees(ORIGIN, to)).toBeCloseTo(expected, 5);
  });

  it('answers between 0 and 360 rather than either side of zero', () => {
    expect(
      bearingDegrees(ORIGIN, { latitude: 1, longitude: -0.001 }),
    ).toBeGreaterThan(350);
  });

  it('has no direction to give between a point and itself', () => {
    expect(bearingDegrees(ISTANBUL, { ...ISTANBUL })).toBe(0);
  });

  it('reads the shorter way round the date line', () => {
    const west = { latitude: 0, longitude: 179.9 };
    const east = { latitude: 0, longitude: -179.9 };

    expect(bearingDegrees(west, east)).toBeCloseTo(90, 3);
  });
});

describe('turnDegrees', () => {
  it('is nothing when the heading does not change', () => {
    expect(turnDegrees(90, 90)).toBe(0);
  });

  it('signs a turn to the right positive and to the left negative', () => {
    expect(turnDegrees(0, 90)).toBe(90);
    expect(turnDegrees(90, 0)).toBe(-90);
  });

  it('takes the shorter way round rather than the long one', () => {
    // 350 to 10 is 20 degrees to the right, not 340 to the left.
    expect(turnDegrees(350, 10)).toBe(20);
    expect(turnDegrees(10, 350)).toBe(-20);
  });

  it('answers 180 for doubling back, whichever way it is written', () => {
    expect(Math.abs(turnDegrees(0, 180))).toBe(180);
    expect(Math.abs(turnDegrees(180, 0))).toBe(180);
  });
});
