import { buildThemedStyles } from './ThemeProvider';
import { darkColors, lightColors, ThemeColors } from './palettes';

describe('buildThemedStyles', () => {
  it('builds a factory once per palette, however many components ask', () => {
    const factory = jest.fn((colors: ThemeColors) => ({
      box: { backgroundColor: colors.surface },
    }));

    const first = buildThemedStyles(factory, lightColors);
    const second = buildThemedStyles(factory, lightColors);
    const third = buildThemedStyles(factory, lightColors);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('builds again for the other palette, and keeps both', () => {
    const factory = jest.fn((colors: ThemeColors) => ({
      box: { backgroundColor: colors.surface },
    }));

    const light = buildThemedStyles(factory, lightColors);
    const dark = buildThemedStyles(factory, darkColors);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(dark).not.toBe(light);
    expect(buildThemedStyles(factory, lightColors)).toBe(light);
    expect(buildThemedStyles(factory, darkColors)).toBe(dark);
  });

  it('keeps one factory out of another factory cache', () => {
    const a = jest.fn(() => ({ tag: 'a' }));
    const b = jest.fn(() => ({ tag: 'b' }));

    expect(buildThemedStyles(a, lightColors)).toEqual({ tag: 'a' });
    expect(buildThemedStyles(b, lightColors)).toEqual({ tag: 'b' });
  });

  it('reflects the palette it was given', () => {
    const factory = (colors: ThemeColors) => ({ bg: colors.background });

    expect(buildThemedStyles(factory, lightColors).bg).toBe(
      lightColors.background,
    );
    expect(buildThemedStyles(factory, darkColors).bg).toBe(
      darkColors.background,
    );
  });
});
