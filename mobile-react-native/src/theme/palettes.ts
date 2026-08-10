export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;

  accent: string;
  accentSoft: string;

  success: string;
  successSoft: string;

  danger: string;
  dangerSoft: string;

  warning: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;

  surface: string;
  surfaceAlt: string;
  background: string;

  border: string;
  borderStrong: string;

  overlay: string;

  route: string;
  routeCasing: string;
  transitRoute: string;
  transitRouteCasing: string;
  walkingRoute: string;
  walkingRouteCasing: string;
}

export const lightColors: ThemeColors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',

  accent: '#E11D48',
  accentSoft: '#FFF1F2',

  success: '#16A34A',
  successSoft: '#F0FDF4',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  warning: '#D97706',

  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  textInverse: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceAlt: '#F4F7FB',
  background: '#F4F6FA',

  border: '#E6EAF2',
  borderStrong: '#CBD5E1',

  overlay: 'rgba(15, 23, 42, 0.45)',

  route: '#2563EB',
  routeCasing: '#93C5FD',
  transitRoute: '#7C3AED',
  transitRouteCasing: '#C4B5FD',
  walkingRoute: '#059669',
  walkingRouteCasing: '#6EE7B7',
};

export const darkColors: ThemeColors = {
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primarySoft: '#18274A',

  accent: '#FB7185',
  accentSoft: '#4C0519',

  success: '#4ADE80',
  successSoft: '#052E16',

  danger: '#F87171',
  dangerSoft: '#450A0A',

  warning: '#FBBF24',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  textInverse: '#0B1220',

  surface: '#161F33',
  surfaceAlt: '#1F2A40',
  background: '#0B1120',

  border: '#2A3550',
  borderStrong: '#3D4A69',

  overlay: 'rgba(2, 6, 23, 0.7)',

  route: '#60A5FA',
  routeCasing: '#1E3A8A',
  transitRoute: '#A78BFA',
  transitRouteCasing: '#4C1D95',
  walkingRoute: '#34D399',
  walkingRouteCasing: '#065F46',
};

export const palettes = { light: lightColors, dark: darkColors };
