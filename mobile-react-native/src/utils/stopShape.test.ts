import type { StopShape } from 'types/map-screen-type';
import {
  bendIcon,
  bendLabel,
  hasShape,
  runLabel,
  slopeIcon,
  slopeLabel,
  UNSHAPED_STOP,
} from './stopShape';

const shape = (overrides: Partial<StopShape>): StopShape => ({
  ...UNSHAPED_STOP,
  ...overrides,
});

describe('slopeLabel', () => {
  it('names the grade, the number and the direction', () => {
    expect(
      slopeLabel(shape({ slopePercent: 7.4, slopeGrade: 'moderate' })),
    ).toBe('Moderate · 7.4% up');
  });

  it('reads a descent as down without repeating the minus sign', () => {
    expect(slopeLabel(shape({ slopePercent: -12, slopeGrade: 'steep' }))).toBe(
      'Steep · 12% down',
    );
  });

  it('drops a trailing zero rather than writing 5.0%', () => {
    expect(
      slopeLabel(shape({ slopePercent: 5, slopeGrade: 'gentle' })),
    ).toContain('5%');
  });

  it('does not say which way flat goes', () => {
    expect(slopeLabel(shape({ slopePercent: 1.2, slopeGrade: 'flat' }))).toBe(
      'Flat · 1.2%',
    );
  });

  it('says nothing where nothing was measured', () => {
    expect(slopeLabel(UNSHAPED_STOP)).toBeNull();
  });
});

describe('bendLabel', () => {
  it('names the turn, its side and its angle', () => {
    expect(
      bendLabel(
        shape({ bendDegrees: 92, bendDirection: 'right', bendShape: 'sharp' }),
      ),
    ).toBe('Sharp right · 92°');
  });

  it('names a straight stop without a side', () => {
    expect(
      bendLabel(
        shape({ bendDegrees: 3, bendDirection: null, bendShape: 'straight' }),
      ),
    ).toBe('Straight · 3°');
  });

  it('says nothing at either end of a route', () => {
    expect(bendLabel(UNSHAPED_STOP)).toBeNull();
  });
});

describe('runLabel', () => {
  it('reads a short leg in metres', () => {
    expect(runLabel(shape({ distanceFromPreviousMeters: 480 }))).toBe('480 m');
  });

  it('reads a long leg in kilometres', () => {
    expect(runLabel(shape({ distanceFromPreviousMeters: 1240 }))).toBe(
      '1.2 km',
    );
  });

  it('says nothing for the first stop', () => {
    expect(runLabel(UNSHAPED_STOP)).toBeNull();
  });
});

describe('icons', () => {
  it('points a climb up and a descent down', () => {
    expect(slopeIcon(shape({ slopePercent: 5, slopeGrade: 'gentle' }))).toBe(
      'trending-up-outline',
    );
    expect(slopeIcon(shape({ slopePercent: -5, slopeGrade: 'gentle' }))).toBe(
      'trending-down-outline',
    );
  });

  it('draws flat and unmeasured the same, as no incline at all', () => {
    expect(slopeIcon(shape({ slopePercent: 1, slopeGrade: 'flat' }))).toBe(
      'remove-outline',
    );
    expect(slopeIcon(UNSHAPED_STOP)).toBe('remove-outline');
  });

  it('turns the arrow the way the route turns', () => {
    expect(bendIcon(shape({ bendDirection: 'left' }))).toBe(
      'arrow-undo-outline',
    );
    expect(bendIcon(shape({ bendDirection: 'right' }))).toBe(
      'arrow-redo-outline',
    );
    expect(bendIcon(UNSHAPED_STOP)).toBe('arrow-up-outline');
  });
});

describe('hasShape', () => {
  it('is false for a stop nothing was measured on', () => {
    expect(hasShape(UNSHAPED_STOP)).toBe(false);
  });

  it('is true as soon as either half is known', () => {
    expect(hasShape(shape({ bendDegrees: 20, bendShape: 'slight' }))).toBe(true);
    expect(
      hasShape(shape({ slopePercent: 2, slopeGrade: 'flat' })),
    ).toBe(true);
  });

  it('is false when only the distance is known', () => {
    // A leg length on its own is not the shape of the road, and a row holding
    // nothing but "480 m" is not worth the line it takes.
    expect(hasShape(shape({ distanceFromPreviousMeters: 480 }))).toBe(false);
  });
});
