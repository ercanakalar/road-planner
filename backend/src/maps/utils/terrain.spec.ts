import { EMPTY_TERRAIN, legTerrain } from './terrain';
import { LatLng } from '../types/maps.types';

/** A straight line north from Istanbul, one point every `stepMeters`. */
const northward = (count: number, stepMeters = 100): LatLng[] =>
  Array.from({ length: count }, (_, i) => ({
    latitude: 41 + (i * stepMeters) / 111_320,
    longitude: 29,
  }));

const flat = (count: number, metres = 100) => Array<number>(count).fill(metres);

describe('legTerrain', () => {
  describe('nothing to measure', () => {
    it('reads an empty leg as flat and straight', () => {
      expect(legTerrain([], [])).toEqual(EMPTY_TERRAIN);
    });

    it('reads a single point as flat and straight', () => {
      expect(legTerrain(northward(1), [10])).toEqual(EMPTY_TERRAIN);
    });
  });

  describe('slope', () => {
    it('finds no climb on level ground', () => {
      const terrain = legTerrain(northward(10), flat(10));

      expect(terrain.climbMeters).toBe(0);
      expect(terrain.descentMeters).toBe(0);
      expect(terrain.averageGradientPercent).toBe(0);
    });

    it('adds up a steady climb and reads its gradient', () => {
      // Ten points 100m apart, rising 5m each step: 45m over 900m is 5%.
      const path = northward(10);
      const rising = Array.from({ length: 10 }, (_, i) => 100 + i * 5);

      const terrain = legTerrain(path, rising);

      expect(terrain.climbMeters).toBe(45);
      expect(terrain.descentMeters).toBe(0);
      expect(terrain.averageGradientPercent).toBeCloseTo(5, 0);
      expect(terrain.steepestGradientPercent).toBeCloseTo(5, 0);
    });

    it('signs a descent negative but counts its metres positive', () => {
      const falling = Array.from({ length: 10 }, (_, i) => 100 - i * 5);

      const terrain = legTerrain(northward(10), falling);

      expect(terrain.descentMeters).toBe(45);
      expect(terrain.climbMeters).toBe(0);
      expect(terrain.averageGradientPercent).toBeLessThan(0);
      expect(terrain.steepestGradientPercent).toBeLessThan(0);
    });

    it('counts a climb and a descent separately over a hill', () => {
      const hill = [100, 120, 140, 160, 140, 120, 100];

      const terrain = legTerrain(northward(7), hill);

      expect(terrain.climbMeters).toBe(60);
      expect(terrain.descentMeters).toBe(60);
      // Up and back down again nets out flat.
      expect(terrain.averageGradientPercent).toBe(0);
    });

    it('ignores wobble smaller than the terrain model can resolve', () => {
      // Google's elevation has a resolution of tens of metres; ±1m between
      // adjacent samples is the model, not the road.
      const noisy = [100, 101, 100, 101, 100, 99, 100, 101, 100, 99];

      const terrain = legTerrain(northward(10), noisy);

      expect(terrain.climbMeters).toBe(0);
      expect(terrain.descentMeters).toBe(0);
    });

    it('keeps the steepest pitch rather than averaging it away', () => {
      // Flat, then one very steep 100m step, then flat again.
      const profile = [100, 100, 100, 130, 130, 130];

      const terrain = legTerrain(northward(6), profile);

      expect(terrain.steepestGradientPercent).toBeGreaterThan(25);
      expect(terrain.averageGradientPercent).toBeLessThan(
        terrain.steepestGradientPercent,
      );
    });

    it('crosses a gap Google had no elevation for in one step', () => {
      // Rather than treating the unknown middle as a cliff down and back up.
      const withGap = [100, null, null, null, 120];

      const terrain = legTerrain(northward(5), withGap);

      expect(terrain.climbMeters).toBe(20);
      expect(terrain.descentMeters).toBe(0);
    });

    it('measures nothing when no point has an elevation', () => {
      const terrain = legTerrain(northward(5), [null, null, null, null, null]);

      expect(terrain.climbMeters).toBe(0);
      expect(terrain.steepestGradientPercent).toBe(0);
    });
  });

  describe('bends', () => {
    it('finds no bend in a straight road', () => {
      const terrain = legTerrain(northward(10), flat(10));

      expect(terrain.bends).toEqual({ gentle: 0, sharp: 0, hairpin: 0 });
      expect(terrain.sharpestBendDegrees).toBe(0);
    });

    it('counts a right angle as a sharp bend', () => {
      const corner: LatLng[] = [
        { latitude: 41, longitude: 29 },
        { latitude: 41.01, longitude: 29 },
        { latitude: 41.01, longitude: 29.01 },
      ];

      const terrain = legTerrain(corner, flat(3));

      expect(terrain.bends.sharp).toBe(1);
      expect(terrain.sharpestBendDegrees).toBeGreaterThanOrEqual(85);
    });

    it('counts a doubling back as a hairpin', () => {
      const hairpin: LatLng[] = [
        { latitude: 41, longitude: 29 },
        { latitude: 41.01, longitude: 29 },
        { latitude: 41.0, longitude: 29.0001 },
      ];

      const terrain = legTerrain(hairpin, flat(3));

      expect(terrain.bends.hairpin).toBe(1);
    });

    it('does not count the drift of a road drawn as many short segments', () => {
      // Each vertex turns a fraction of a degree — that is how a straight road
      // is drawn, not a sequence of bends.
      const drifting: LatLng[] = Array.from({ length: 20 }, (_, i) => ({
        latitude: 41 + i * 0.001,
        longitude: 29 + i * 0.00002,
      }));

      const terrain = legTerrain(drifting, flat(20));

      expect(terrain.bends).toEqual({ gentle: 0, sharp: 0, hairpin: 0 });
    });

    it('counts left and right bends alike', () => {
      const slalom: LatLng[] = [
        { latitude: 41.0, longitude: 29.0 },
        { latitude: 41.01, longitude: 29.0 },
        { latitude: 41.01, longitude: 29.01 },
        { latitude: 41.02, longitude: 29.01 },
      ];

      const terrain = legTerrain(slalom, flat(4));

      expect(terrain.bends.sharp).toBe(2);
    });
  });
});
