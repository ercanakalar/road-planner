import { buildMapStyle } from './mapStyles';
import { darkColors, lightColors } from 'theme/palettes';
import type { ThemeColors } from 'theme/palettes';

const colorsIn = (style: ReturnType<typeof buildMapStyle>) =>
  style
    .flatMap((entry) => entry.stylers)
    .map((styler) => (styler as { color?: string }).color)
    .filter((color): color is string => !!color);

const find = (
  style: ReturnType<typeof buildMapStyle>,
  featureType: string | undefined,
  elementType: string,
) =>
  style.find(
    (entry) =>
      entry.featureType === featureType && entry.elementType === elementType,
  );

const colorOf = (
  style: ReturnType<typeof buildMapStyle>,
  featureType: string | undefined,
  elementType: string,
) => {
  const entry = find(style, featureType, elementType);
  return (entry?.stylers[0] as { color?: string } | undefined)?.color;
};

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('buildMapStyle — %s', (_name, colors: ThemeColors) => {
  const style = buildMapStyle(colors);

  it('takes every colour from the palette and hardcodes none', () => {
    // A literal here is how a map drifts away from the app it sits in.
    const palette = new Set(Object.values(colors));

    expect(colorsIn(style).filter((color) => !palette.has(color))).toEqual([]);
  });

  it('draws the land in the app background', () => {
    expect(colorOf(style, undefined, 'geometry')).toBe(colors.background);
  });

  it('separates water from land, so the coast reads', () => {
    // Water has its own token rather than a brand tint: the app is green, and
    // a green sea reads as land.
    expect(colorOf(style, 'water', 'geometry')).toBe(colors.water);
    expect(colorOf(style, 'water', 'geometry')).not.toBe(colors.background);
  });

  it('separates routes from land', () => {
    expect(colorOf(style, 'road', 'geometry')).not.toBe(colors.background);
  });

  it('haloes labels in the land colour, which is what keeps them legible', () => {
    expect(colorOf(style, undefined, 'labels.text.stroke')).toBe(
      colors.background,
    );
  });

  it('leaves the basemap clear of the colours the app draws pins in', () => {
    // Stop pins, found places and the compared pair are all drawn over
    // this; a basemap that used one of their colours would camouflage it.
    const pinColors = [
      colors.success,
      colors.accent,
      colors.primary,
      colors.place,
      colors.selection,
    ];

    expect(
      colorsIn(style).filter((color) => pinColors.includes(color)),
    ).toEqual([]);
  });

  it('leaves the basemap clear of the colours the route line is drawn in', () => {
    const routeColors = [
      colors.route,
      colors.transitRoute,
      colors.walkingRoute,
    ];

    expect(
      colorsIn(style).filter((color) => routeColors.includes(color)),
    ).toEqual([]);
  });

  it('hides the pins Google would draw, which compete with the app’s own', () => {
    const hidden = style
      .filter((entry) =>
        entry.stylers.some(
          (styler) => (styler as { visibility?: string }).visibility === 'off',
        ),
      )
      .map((entry) => `${entry.featureType}.${entry.elementType}`);

    expect(hidden).toContain('poi.labels.icon');
  });
});

describe('buildMapStyle across themes', () => {
  it('produces a different map for each theme', () => {
    expect(buildMapStyle(lightColors)).not.toEqual(buildMapStyle(darkColors));
  });

  it('styles the same features in both, so neither falls back to Google’s', () => {
    const key = (entry: { featureType?: string; elementType?: string }) =>
      `${entry.featureType}.${entry.elementType}`;

    expect(buildMapStyle(lightColors).map(key)).toEqual(
      buildMapStyle(darkColors).map(key),
    );
  });

  it('is a plain function of the palette, so the same palette is the same map', () => {
    expect(buildMapStyle(lightColors)).toEqual(buildMapStyle(lightColors));
  });
});
