export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorScheme = 'light' | 'dark';


export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';
