import {
  bearingDegrees,
  haversineMeters,
  turnDegrees,
} from 'src/maps/utils/geo';

/**
 * What a stop needs to carry for its slope and bend to be worked out: where it
 * is, and how high the ground is under it.
 */
export interface StopGeometry {
  latitude: number;
  longitude: number;
  elevation?: number | null;
}

export type SlopeGrade = 'flat' | 'gentle' | 'moderate' | 'steep';

export type BendShape = 'straight' | 'slight' | 'moderate' | 'sharp' | 'hairpin';

export type BendDirection = 'left' | 'right';

/**
 * The shape of the road at one stop. Every field is null when there is not
 * enough around the stop to know: the first stop has nothing to climb from, the
 * last has nothing to turn towards, and a stop whose elevation was never
 * resolved has no slope even in the middle of a route.
 */
export interface StopMetrics {
  /** Straight-line distance from the previous stop, in metres. */
  distanceFromPreviousMeters: number | null;
  /** Height gained since the previous stop; negative going downhill. */
  climbMeters: number | null;
  /** That climb as a percentage of the ground covered. */
  slopePercent: number | null;
  /** The same number as a band, for a label that does not need a decimal. */
  slopeGrade: SlopeGrade | null;
  /** How sharply the route turns here, 0 for straight on and 180 for back. */
  bendDegrees: number | null;
  /** Which way that turn goes. */
  bendDirection: BendDirection | null;
  /** The turn as a band, on the same terms as slopeGrade. */
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

/**
 * Below this the two stops are the same pin as far as slope goes. A metre of
 * climb over a few centimetres of ground is a vertical wall on paper and noise
 * in practice, and dividing by it produces numbers in the thousands.
 */
const MIN_RUN_METERS = 5;

/**
 * Cycling's usual reading of a gradient, which is also roughly where a driver
 * starts to notice one: under 3% reads flat, 3-6% is a pull, 6-10% is work, and
 * past 10% is steep enough to plan around.
 */
const SLOPE_BANDS: readonly [number, SlopeGrade][] = [
  [3, 'flat'],
  [6, 'gentle'],
  [10, 'moderate'],
];

/**
 * A turn of a few degrees is the road drifting, not bending. The rest follow
 * how a turn is described when giving directions: a slight left, a left, a
 * sharp left, and back the way you came.
 */
const BEND_BANDS: readonly [number, BendShape][] = [
  [10, 'straight'],
  [35, 'slight'],
  [80, 'moderate'],
  [130, 'sharp'],
];

const band = <T>(value: number, bands: readonly [number, T][], last: T): T =>
  bands.find(([ceiling]) => value < ceiling)?.[1] ?? last;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const hasElevation = (stop: StopGeometry): stop is StopGeometry & {
  elevation: number;
} => typeof stop.elevation === 'number' && Number.isFinite(stop.elevation);

/**
 * Slope and bend for every stop on a route, in the order they were given.
 *
 * Both are properties of a stop's neighbours rather than of the stop itself,
 * which is why they are worked out here on the way out instead of being stored:
 * adding a stop in the middle of a route changes the slope and the bend of the
 * ones on either side of it, and stored copies would quietly disagree with the
 * map.
 */
export function stopMetrics(
  stops: readonly StopGeometry[],
): StopMetrics[] {
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

  // Two pins in the same place have no direction between them, and bearing
  // answers 0 for that — which would read as a hard turn to whatever comes
  // next. There is no angle to report here, so none is.
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
    // A road that goes straight on has not turned either way, so naming a side
    // would be inventing one.
    bendDirection:
      bendShape === 'straight' ? null : turn < 0 ? 'left' : 'right',
    bendShape,
  };
}

/**
 * The stops as they came in, each with its slope and bend attached. The shape
 * every endpoint that returns stops hands back.
 */
export function withStopMetrics<T extends StopGeometry>(
  stops: readonly T[],
): (T & StopMetrics)[] {
  const metrics = stopMetrics(stops);

  return stops.map((stop, index) => ({ ...stop, ...metrics[index] }));
}
