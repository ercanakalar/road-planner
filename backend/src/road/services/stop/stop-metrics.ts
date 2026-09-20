import {
  bearingDegrees,
  haversineMeters,
  turnDegrees,
} from 'src/maps/utils/geo';

export interface StopGeometry {
  latitude: number;
  longitude: number;
  elevation?: number | null;
}

export type SlopeGrade = 'flat' | 'gentle' | 'moderate' | 'steep';

export type BendShape =
  'straight' | 'slight' | 'moderate' | 'sharp' | 'hairpin';

export type BendDirection = 'left' | 'right';

export interface StopMetrics {
  distanceFromPreviousMeters: number | null;
  climbMeters: number | null;
  slopePercent: number | null;
  slopeGrade: SlopeGrade | null;
  bendDegrees: number | null;
  bendDirection: BendDirection | null;
  bendShape: BendShape | null;
}

export const NO_METRICS: StopMetrics = {
  distanceFromPreviousMeters: null,
  climbMeters: null,
  slopePercent: null,
  slopeGrade: null,
  bendDegrees: null,
  bendDirection: null,
  bendShape: null,
};

const MIN_RUN_METERS = 5;

const SLOPE_BANDS: readonly [number, SlopeGrade][] = [
  [3, 'flat'],
  [6, 'gentle'],
  [10, 'moderate'],
];

const BEND_BANDS: readonly [number, BendShape][] = [
  [10, 'straight'],
  [35, 'slight'],
  [80, 'moderate'],
  [130, 'sharp'],
];

const band = <T>(value: number, bands: readonly [number, T][], last: T): T =>
  bands.find(([ceiling]) => value < ceiling)?.[1] ?? last;

export const slopeGradeFor = (percent: number): SlopeGrade =>
  band(Math.abs(percent), SLOPE_BANDS, 'steep');

export const bendShapeFor = (degrees: number): BendShape =>
  band(Math.abs(degrees), BEND_BANDS, 'hairpin');

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const hasElevation = (
  stop: StopGeometry,
): stop is StopGeometry & {
  elevation: number;
} => typeof stop.elevation === 'number' && Number.isFinite(stop.elevation);

export function stopMetrics(stops: readonly StopGeometry[]): StopMetrics[] {
  return stops.map((stop, index) => {
    const previous = index > 0 ? stops[index - 1] : undefined;
    const next = index < stops.length - 1 ? stops[index + 1] : undefined;

    return {
      ...slopeFrom(previous, stop),
      ...bendAt(previous, stop, next),
    };
  });
}

function slopeFrom(
  previous: StopGeometry | undefined,
  stop: StopGeometry,
): Pick<
  StopMetrics,
  'distanceFromPreviousMeters' | 'climbMeters' | 'slopePercent' | 'slopeGrade'
> {
  if (!previous) {
    return {
      distanceFromPreviousMeters: null,
      climbMeters: null,
      slopePercent: null,
      slopeGrade: null,
    };
  }

  const run = haversineMeters(previous, stop);
  const distanceFromPreviousMeters = round(run, 1);

  if (!hasElevation(previous) || !hasElevation(stop)) {
    return {
      distanceFromPreviousMeters,
      climbMeters: null,
      slopePercent: null,
      slopeGrade: null,
    };
  }

  const climbMeters = round(stop.elevation - previous.elevation, 1);

  if (run < MIN_RUN_METERS) {
    return {
      distanceFromPreviousMeters,
      climbMeters,
      slopePercent: null,
      slopeGrade: null,
    };
  }

  const slopePercent = round((climbMeters / run) * 100, 1);

  return {
    distanceFromPreviousMeters,
    climbMeters,
    slopePercent,
    slopeGrade: band(Math.abs(slopePercent), SLOPE_BANDS, 'steep'),
  };
}

function bendAt(
  previous: StopGeometry | undefined,
  stop: StopGeometry,
  next: StopGeometry | undefined,
): Pick<StopMetrics, 'bendDegrees' | 'bendDirection' | 'bendShape'> {
  if (!previous || !next) {
    return { bendDegrees: null, bendDirection: null, bendShape: null };
  }

  if (
    haversineMeters(previous, stop) === 0 ||
    haversineMeters(stop, next) === 0
  ) {
    return { bendDegrees: null, bendDirection: null, bendShape: null };
  }

  const turn = turnDegrees(
    bearingDegrees(previous, stop),
    bearingDegrees(stop, next),
  );

  const bendDegrees = round(Math.abs(turn), 1);
  const bendShape = band(bendDegrees, BEND_BANDS, 'hairpin');

  return {
    bendDegrees,
    bendDirection:
      bendShape === 'straight' ? null : turn < 0 ? 'left' : 'right',
    bendShape,
  };
}

export function withStopMetrics<T extends StopGeometry>(
  stops: readonly T[],
): (T & StopMetrics)[] {
  const metrics = stopMetrics(stops);

  return stops.map((stop, index) => ({ ...stop, ...metrics[index] }));
}
