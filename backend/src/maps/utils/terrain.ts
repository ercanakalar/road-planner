import { bearingDegrees, haversineMeters, turnDegrees } from './geo';
import { LatLng } from '../types/maps.types';

const ELEVATION_NOISE_METERS = 2;

const STRAIGHT_DEGREES = 15;

const MIN_GRADIENT_RUN_METERS = 20;

export type BendSeverity = 'gentle' | 'sharp' | 'hairpin';

const severityOf = (degrees: number): BendSeverity | null => {
  const turn = Math.abs(degrees);
  if (turn < STRAIGHT_DEGREES) return null;
  if (turn < 45) return 'gentle';
  if (turn < 90) return 'sharp';
  return 'hairpin';
};

export interface LegTerrain {
  climbMeters: number;
  descentMeters: number;
  steepestGradientPercent: number;
  averageGradientPercent: number;
  bends: Record<BendSeverity, number>;
  sharpestBendDegrees: number;
  sharpestBendDirection: 'left' | 'right' | null;
}

export const EMPTY_TERRAIN: LegTerrain = {
  climbMeters: 0,
  descentMeters: 0,
  steepestGradientPercent: 0,
  averageGradientPercent: 0,
  bends: { gentle: 0, sharp: 0, hairpin: 0 },
  sharpestBendDegrees: 0,
  sharpestBendDirection: null,
};

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const bridgeGaps = (
  elevation: readonly (number | null)[],
): (number | null)[] => {
  const filled = [...elevation];

  for (let i = 0; i < filled.length; i += 1) {
    if (filled[i] !== null) continue;

    const before = i - 1;
    let after = i;
    while (after < filled.length && filled[after] === null) after += 1;

    const start = before >= 0 ? filled[before] : null;
    const end = after < filled.length ? filled[after] : null;
    if (start === null || end === null) continue;

    const steps = after - before;
    for (let j = i; j < after; j += 1) {
      filled[j] = start + ((end - start) * (j - before)) / steps;
    }
  }

  return filled;
};

export function legTerrain(
  path: readonly LatLng[],
  elevation: readonly (number | null)[],
): LegTerrain {
  if (path.length < 2) return EMPTY_TERRAIN;

  const profile = bridgeGaps(elevation);

  let climb = 0;
  let descent = 0;
  let steepest = 0;
  let totalMeters = 0;

  for (let i = 1; i < path.length; i += 1) {
    const run = haversineMeters(path[i - 1], path[i]);
    totalMeters += run;

    const from = profile[i - 1];
    const to = profile[i];
    if (typeof from !== 'number' || typeof to !== 'number') continue;

    const rise = to - from;

    if (Math.abs(rise) < ELEVATION_NOISE_METERS) continue;

    if (rise > 0) climb += rise;
    else descent -= rise;

    if (run >= MIN_GRADIENT_RUN_METERS) {
      const gradient = (rise / run) * 100;
      if (Math.abs(gradient) > Math.abs(steepest)) steepest = gradient;
    }
  }

  const bends: Record<BendSeverity, number> = {
    gentle: 0,
    sharp: 0,
    hairpin: 0,
  };
  let sharpest = 0;

  for (let i = 1; i < path.length - 1; i += 1) {
    const turn = turnDegrees(
      bearingDegrees(path[i - 1], path[i]),
      bearingDegrees(path[i], path[i + 1]),
    );
    const severity = severityOf(turn);
    if (!severity) continue;

    bends[severity] += 1;
    if (Math.abs(turn) > Math.abs(sharpest)) sharpest = turn;
  }

  const net = climb - descent;

  return {
    climbMeters: Math.round(climb),
    descentMeters: Math.round(descent),
    steepestGradientPercent: round(steepest, 1),
    averageGradientPercent:
      totalMeters > 0 ? round((net / totalMeters) * 100, 1) : 0,
    bends,
    sharpestBendDegrees: Math.round(Math.abs(sharpest)),
    sharpestBendDirection:
      sharpest === 0 ? null : sharpest < 0 ? 'left' : 'right',
  };
}
