import { stopMetrics, withStopMetrics } from './stop-metrics';

/**
 * A degree of latitude is ~111km, so these read as round distances: 0.009 of a
 * degree north is almost exactly a kilometre.
 */
const KM = 0.008993;

const at = (
  north: number,
  east: number,
  elevation?: number | null,
): { latitude: number; longitude: number; elevation?: number | null } => ({
  latitude: north,
  longitude: east,
  ...(elevation === undefined ? {} : { elevation }),
});

describe('stopMetrics', () => {
  describe('slope', () => {
    it('reports the climb between two stops as a percentage of the ground', () => {
      // 1km apart, 50m higher: a 5% grade.
      const [, second] = stopMetrics([at(0, 0, 100), at(KM, 0, 150)]);

      expect(second.climbMeters).toBe(50);
      expect(second.distanceFromPreviousMeters).toBeCloseTo(1000, -1);
      expect(second.slopePercent).toBeCloseTo(5, 1);
    });

    it('signs a descent negative', () => {
      const [, second] = stopMetrics([at(0, 0, 200), at(KM, 0, 150)]);

      expect(second.climbMeters).toBe(-50);
      expect(second.slopePercent).toBeLessThan(0);
    });

    it('bands a grade so a label does not need the decimal', () => {
      const grade = (climb: number) =>
        stopMetrics([at(0, 0, 0), at(KM, 0, climb)])[1].slopeGrade;

      expect(grade(10)).toBe('flat');
      expect(grade(45)).toBe('gentle');
      expect(grade(80)).toBe('moderate');
      expect(grade(150)).toBe('steep');
    });

    it('bands a descent by how steep it is, not by which way it goes', () => {
      const [, downhill] = stopMetrics([at(0, 0, 150), at(KM, 0, 0)]);

      expect(downhill.slopePercent).toBeLessThan(-10);
      expect(downhill.slopeGrade).toBe('steep');
    });

    it('leaves the first stop with nothing to have climbed from', () => {
      const [first] = stopMetrics([at(0, 0, 100), at(KM, 0, 150)]);

      expect(first.slopePercent).toBeNull();
      expect(first.climbMeters).toBeNull();
      expect(first.distanceFromPreviousMeters).toBeNull();
    });

    it('reports the distance even when neither height is known', () => {
      const [, second] = stopMetrics([at(0, 0), at(KM, 0)]);

      expect(second.distanceFromPreviousMeters).toBeCloseTo(1000, -1);
      expect(second.slopePercent).toBeNull();
      expect(second.slopeGrade).toBeNull();
    });

    it('needs both ends measured before it will name a grade', () => {
      const [, second] = stopMetrics([at(0, 0, 100), at(KM, 0, null)]);

      expect(second.slopePercent).toBeNull();
    });

    it('refuses to divide a real climb by a few centimetres of ground', () => {
      // Two pins on the same corner, one of them measured a metre higher. As a
      // gradient that is hundreds of percent, and as a road it is nothing.
      const [, second] = stopMetrics([at(0, 0, 100), at(0.000005, 0, 101)]);

      expect(second.climbMeters).toBe(1);
      expect(second.slopePercent).toBeNull();
      expect(second.slopeGrade).toBeNull();
    });
  });

  describe('bend', () => {
    it('calls a stop the route runs straight through straight', () => {
      const [, middle] = stopMetrics([at(0, 0), at(KM, 0), at(2 * KM, 0)]);

      expect(middle.bendDegrees).toBeCloseTo(0, 1);
      expect(middle.bendShape).toBe('straight');
      expect(middle.bendDirection).toBeNull();
    });

    it('measures a right-angle turn to the right', () => {
      // North, then east.
      const [, middle] = stopMetrics([at(0, 0), at(KM, 0), at(KM, KM)]);

      expect(middle.bendDegrees).toBeCloseTo(90, 0);
      expect(middle.bendDirection).toBe('right');
      expect(middle.bendShape).toBe('sharp');
    });

    it('measures a right-angle turn to the left', () => {
      const [, middle] = stopMetrics([at(0, 0), at(KM, 0), at(KM, -KM)]);

      expect(middle.bendDegrees).toBeCloseTo(90, 0);
      expect(middle.bendDirection).toBe('left');
    });

    it('calls doubling back a hairpin rather than a 180 either way', () => {
      const [, middle] = stopMetrics([at(0, 0), at(KM, 0), at(0.0001, 0)]);

      expect(middle.bendDegrees).toBeGreaterThan(170);
      expect(middle.bendShape).toBe('hairpin');
    });

    it('bands a turn by how sharp it is', () => {
      // A tenth of the eastward step turns the route by ~6 degrees.
      const shapeOf = (east: number) =>
        stopMetrics([at(0, 0), at(KM, 0), at(2 * KM, east)])[1].bendShape;

      expect(shapeOf(KM * 0.05)).toBe('straight');
      expect(shapeOf(KM * 0.4)).toBe('slight');
      expect(shapeOf(KM * 2)).toBe('moderate');
    });

    it('leaves the ends of a route with nothing to turn towards', () => {
      const metrics = stopMetrics([at(0, 0), at(KM, 0), at(2 * KM, KM)]);

      expect(metrics[0].bendDegrees).toBeNull();
      expect(metrics[2].bendDegrees).toBeNull();
    });

    it('reports no bend where two stops sit on the same pin', () => {
      // There is no direction between a point and itself, so there is no angle
      // to report — rather than the 0 a bearing would answer, which would read
      // as a hard turn onto whatever comes next.
      const [, middle] = stopMetrics([at(0, 0), at(0, 0), at(KM, KM)]);

      expect(middle.bendDegrees).toBeNull();
      expect(middle.bendShape).toBeNull();
    });
  });

  it('gives a lone stop nothing at all', () => {
    const [only] = stopMetrics([at(0, 0, 100)]);

    expect(only).toEqual({
      distanceFromPreviousMeters: null,
      climbMeters: null,
      slopePercent: null,
      slopeGrade: null,
      bendDegrees: null,
      bendDirection: null,
      bendShape: null,
    });
  });

  it('answers an empty route with an empty list', () => {
    expect(stopMetrics([])).toEqual([]);
  });
});

describe('withStopMetrics', () => {
  it('keeps everything the stop already carried', () => {
    const stops = [
      { id: 'a', address: 'One', ...at(0, 0, 100) },
      { id: 'b', address: 'Two', ...at(KM, 0, 150) },
    ];

    const [, second] = withStopMetrics(stops);

    expect(second).toMatchObject({ id: 'b', address: 'Two', climbMeters: 50 });
  });

  it('does not touch the stops it was given', () => {
    const stops = [at(0, 0, 100), at(KM, 0, 150)];

    withStopMetrics(stops);

    expect(stops[1]).toEqual(at(KM, 0, 150));
  });
});
