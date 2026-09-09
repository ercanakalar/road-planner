import { bearingDegrees, haversineMeters, turnDegrees } from './geo';
import { LatLng } from '../types/maps.types';

/**
 * Reads the shape of a leg of road: how much it climbs, how steep it gets, and
 * how much it bends.
 *
 * Both halves have the same trap. A road polyline has a vertex wherever the
 * geometry needed one, and Google's elevation comes off a terrain model with a
 * resolution of tens of metres. Add up every raw difference between adjacent
 * points and you measure the sampling, not the road: a dead-flat motorway
 * "climbs" hundreds of metres and a straight one "bends" continuously. So the
 * caller samples the polyline at a fixed spacing first, and the thresholds
 * below drop what is left of the noise.
 */

/**
 * Elevation changes smaller than this between two samples are read as terrain
 * model noise, not as slope. Google's own resolution is often 10m or worse.
 */
const ELEVATION_NOISE_METERS = 2;

/** Turns gentler than this are how a straight road is actually drawn. */
const STRAIGHT_DEGREES = 15;

/** A gradient needs a run this long under it before it means anything. */
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
  /** Metres gained over the leg, counting only the climbs. */
  climbMeters: number;
  /** Metres lost, as a positive number. */
  descentMeters: number;
  /** The steepest stretch, as a percentage. Signed: negative is downhill. */
  steepestGradientPercent: number;
  /** Net rise over the whole run, as a percentage. Signed. */
  averageGradientPercent: number;
  /** How many bends, by how sharp they are. */
  bends: Record<BendSeverity, number>;
  /** The tightest turn on the leg, in degrees. Unsigned. */
  sharpestBendDegrees: number;
  /** Which way that tightest turn went, or null if the leg never bent. */
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

/**
 * Fills points Google had no elevation for by interpolating between the known
 * points either side, so a gap is crossed as a straight ramp rather than read
 * as a cliff down and back up. A gap at either end has nothing to interpolate
 * between and stays unknown.
 */
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

/**
 * @param path      the road, already sampled at a roughly even spacing
 * @param elevation metres above sea level per point; null where unknown
 */
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

    // The threshold decides whether a step counts as slope at all. It is
    // deliberately not carried across steps: anchoring on the last point that
    // cleared it would let a flat stretch lengthen the run under the climb
    // that follows, and report a 30% ramp out of a valley as a 10% one.
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
  // Kept signed, so the sharpest turn on the leg can say which way it went.
  let sharpest = 0;

  for (let i = 1; i < path.length - 1; i += 1) {
    // The turn from the heading that reached this vertex to the one that
    // leaves it. Composed here rather than kept as its own three-point helper,
    // since geo already answers both halves.
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
