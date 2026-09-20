import type {
  BendShape,
  SlopeGrade,
  StopShape,
} from 'types/map-screen-type';

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

export const slopeLabel = (shape: StopShape): string | null => {
  if (shape.slopePercent === null || !shape.slopeGrade) return null;

  const grade = SLOPE_WORDS[shape.slopeGrade];
  const percent = Math.abs(shape.slopePercent).toFixed(1).replace(/\.0$/, '');

  if (shape.slopeGrade === 'flat') return `${grade} · ${percent}%`;

  return `${grade} · ${percent}% ${shape.slopePercent > 0 ? 'up' : 'down'}`;
};

export const bendLabel = (shape: StopShape): string | null => {
  if (shape.bendDegrees === null || !shape.bendShape) return null;

  const degrees = `${Math.round(shape.bendDegrees)}°`;

  if (!shape.bendDirection) return `${BEND_WORDS[shape.bendShape]} · ${degrees}`;

  return `${BEND_WORDS[shape.bendShape]} ${shape.bendDirection} · ${degrees}`;
};

export const runLabel = (shape: StopShape): string | null => {
  const meters = shape.distanceFromPreviousMeters;
  if (meters === null) return null;

  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
};

export const hasShape = (shape: StopShape): boolean =>
  slopeLabel(shape) !== null || bendLabel(shape) !== null;
