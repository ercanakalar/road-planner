import { resolveScheme } from './ThemeProvider';
import { darkColors, lightColors } from './palettes';
import { isThemeMode } from 'types/theme';

describe('resolveScheme', () => {
  it('honours an explicit choice whatever the phone reports', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('follows the phone in automatic mode', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('falls back to light when the phone reports nothing', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('isThemeMode', () => {
  it('accepts the three supported modes', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isThemeMode('sepia')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(1)).toBe(false);
  });
});

describe('palettes', () => {
  it('define the same tokens in both schemes', () => {
    expect(Object.keys(darkColors).sort()).toEqual(
      Object.keys(lightColors).sort(),
    );
  });

  it('do not share a background and text colour', () => {
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.text).not.toBe(lightColors.text);
  });
});
