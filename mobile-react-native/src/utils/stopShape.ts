import i18n from 'i18n';
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

// Translation keys rather than words: the words, and the order they go in,
// differ by language ("Sharp left · 92°", "Sola keskin viraj · 92°").
const SLOPE_WORDS: Record<SlopeGrade, string> = {
  flat: 'terrain.gradeFlat',
  gentle: 'terrain.gradeGentle',
  moderate: 'terrain.gradeModerate',
  steep: 'terrain.gradeSteep',
};

const BEND_WORDS: Record<BendShape, { alone: string; turning: string }> = {
  straight: { alone: 'terrain.bendStraight', turning: 'terrain.bendStraightTurn' },
  slight: { alone: 'terrain.bendSlight', turning: 'terrain.bendSlightTurn' },
  moderate: { alone: 'terrain.bendModerate', turning: 'terrain.bendModerateTurn' },
  sharp: { alone: 'terrain.bendSharp', turning: 'terrain.bendSharpTurn' },
  hairpin: { alone: 'terrain.bendHairpin', turning: 'terrain.bendHairpinTurn' },
};

const decimal = (value: string): string =>
  i18n.language === 'tr' ? value.replace('.', ',') : value;

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

  const grade = i18n.t(SLOPE_WORDS[shape.slopeGrade]);
  const percent = decimal(
    Math.abs(shape.slopePercent).toFixed(1).replace(/\.0$/, ''),
  );

  if (shape.slopeGrade === 'flat') {
    return i18n.t('terrain.slopeLevel', { grade, percent });
  }

  return i18n.t(
    shape.slopePercent > 0 ? 'terrain.slopeUp' : 'terrain.slopeDown',
    { grade, percent },
  );
};

export const bendLabel = (shape: StopShape): string | null => {
  if (shape.bendDegrees === null || !shape.bendShape) return null;

  const degrees = Math.round(shape.bendDegrees);
  const words = BEND_WORDS[shape.bendShape];

  if (!shape.bendDirection) {
    return i18n.t('terrain.bendAlone', { bend: i18n.t(words.alone), degrees });
  }

  return i18n.t(
    shape.bendDirection === 'left' ? 'terrain.bendLeft' : 'terrain.bendRight',
    { bend: i18n.t(words.turning), degrees },
  );
};

export const runLabel = (shape: StopShape): string | null => {
  const meters = shape.distanceFromPreviousMeters;
  if (meters === null) return null;

  return meters >= 1000
    ? i18n.t('units.kilometres', { value: decimal((meters / 1000).toFixed(1)) })
    : i18n.t('units.metres', { value: Math.round(meters) });
};

export const hasShape = (shape: StopShape): boolean =>
  slopeLabel(shape) !== null || bendLabel(shape) !== null;
