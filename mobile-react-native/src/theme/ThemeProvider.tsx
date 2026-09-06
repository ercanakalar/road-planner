import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppSelector } from 'store/hook';
import { ColorScheme, ThemeMode } from 'types/theme';
import { darkColors, lightColors, ThemeColors } from './palettes';

// React Native 0.86 reports "unspecified" where it used to report null, so the
// system scheme is wider than our own two-value ColorScheme.
export const resolveScheme = (
  mode: ThemeMode,
  systemScheme: ColorScheme | 'unspecified' | null | undefined,
): ColorScheme => {
  if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return mode;
};

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  mode: ThemeMode;
  isDark: boolean;
}

const defaultValue: ThemeContextValue = {
  colors: lightColors,
  scheme: 'light',
  mode: 'system',
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const mode = useAppSelector((state) => state.settings.themeMode);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = resolveScheme(mode, systemScheme);
    return {
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      mode,
      isDark: scheme === 'dark',
    };
  }, [mode, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

export function useThemedTextInputProps() {
  const { colors, isDark } = useTheme();

  return useMemo(
    () => ({
      placeholderTextColor: colors.textSubtle,
      selectionColor: colors.primary,
      cursorColor: colors.primary,
      keyboardAppearance: (isDark ? 'dark' : 'light') as 'dark' | 'light',
    }),
    [colors, isDark],
  );
}

const styleCache = new WeakMap<
  (colors: ThemeColors) => unknown,
  Map<ThemeColors, unknown>
>();

export function buildThemedStyles<T>(
  factory: (colors: ThemeColors) => T,
  colors: ThemeColors,
): T {
  let byPalette = styleCache.get(factory);

  if (!byPalette) {
    byPalette = new Map();
    styleCache.set(factory, byPalette);
  }

  if (!byPalette.has(colors)) {
    byPalette.set(colors, factory(colors));
  }

  return byPalette.get(colors) as T;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => buildThemedStyles(factory, colors), [colors, factory]);
}

export default ThemeProvider;
