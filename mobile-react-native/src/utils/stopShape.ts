import type {
  BendShape,
  SlopeGrade,
  StopShape,
} from 'types/map-screen-type';

/**
 * A stop nothing has been measured on yet: one drawn optimistically before the
 * server has answered, or one kept only on this device. The server works slope
 * and bend out from a stop's neighbours, so a stop that has not been through it
 * carries no numbers rather than made-up ones.
 */
export const UNSHAPED_STOP: StopShape = {
  distanceFromPreviousMeters: null,
  climbMeters: null,
  slopePercent: null,
  slopeGrade: null,
  bendDegrees: null,
  bendDirection: null,
  bendShape: null,
};

const SLOPE_WORDS: Record<SlopeGrade, string> = {
  flat: 'Flat',
  gentle: 'Gentle',
  moderate: 'Moderate',
  steep: 'Steep',
};

const BEND_WORDS: Record<BendShape, string> = {
  straight: 'Straight',
  slight: 'Slight',
  moderate: 'Bend',
  sharp: 'Sharp',
  hairpin: 'Hairpin',
};

/**
 * Icons carry the reading at a glance, so uphill and downhill get their own
 * arrow rather than a shared one with a sign next to it.
 */
export const slopeIcon = (
  shape: StopShape,
): 'trending-up-outline' | 'trending-down-outline' | 'remove-outline' => {
  if (shape.slopePercent === null || shape.slopeGrade === 'flat') {
    return 'remove-outline';
  }

  return shape.slopePercent > 0
    ? 'trending-up-outline'
    : 'trending-down-outline';
};

export const bendIcon = (
  shape: StopShape,
): 'arrow-undo-outline' | 'arrow-redo-outline' | 'arrow-up-outline' =>
  shape.bendDirection === 'left'
    ? 'arrow-undo-outline'
    : shape.bendDirection === 'right'
      ? 'arrow-redo-outline'
      : 'arrow-up-outline';

/**
 * "Steep 8% up", or null where there is nothing to say — the first stop of a
 * route, or one whose ground height the Elevation API never answered for.
 */
export const slopeLabel = (shape: StopShape): string | null => {
  if (shape.slopePercent === null || !shape.slopeGrade) return null;

  const grade = SLOPE_WORDS[shape.slopeGrade];
  const percent = Math.abs(shape.slopePercent).toFixed(1).replace(/\.0$/, '');

  if (shape.slopeGrade === 'flat') return `${grade} · ${percent}%`;

  return `${grade} · ${percent}% ${shape.slopePercent > 0 ? 'up' : 'down'}`;
};

/** "Sharp left · 92°", or null at either end of a route. */
export const bendLabel = (shape: StopShape): string | null => {
  if (shape.bendDegrees === null || !shape.bendShape) return null;

  const degrees = `${Math.round(shape.bendDegrees)}°`;

  if (!shape.bendDirection) return `${BEND_WORDS[shape.bendShape]} · ${degrees}`;

  return `${BEND_WORDS[shape.bendShape]} ${shape.bendDirection} · ${degrees}`;
};

/** "1.2 km" or "480 m" from the stop before, or null for the first one. */
export const runLabel = (shape: StopShape): string | null => {
  const meters = shape.distanceFromPreviousMeters;
  if (meters === null) return null;

  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
};

/** True when a stop has anything worth drawing a shape row for. */
export const hasShape = (shape: StopShape): boolean =>
  slopeLabel(shape) !== null || bendLabel(shape) !== null;
