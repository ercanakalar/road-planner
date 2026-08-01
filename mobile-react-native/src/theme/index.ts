import { Platform, ViewStyle } from 'react-native';

export const colors = {
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
  surfaceAlt: '#F8FAFC',
  background: '#F1F5F9',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  overlay: 'rgba(15, 23, 42, 0.45)',

  route: '#2563EB',
  routeCasing: '#93C5FD',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;

type Elevation = Pick<
  ViewStyle,
  | 'shadowColor'
  | 'shadowOffset'
  | 'shadowOpacity'
  | 'shadowRadius'
  | 'elevation'
>;

const elevation = (level: 1 | 2 | 3): Elevation =>
  Platform.select<Elevation>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: level },
      shadowOpacity: 0.04 + level * 0.03,
      shadowRadius: level * 4,
    },
    default: { elevation: level * 2 },
  })!;

export const shadows = {
  sm: elevation(1),
  md: elevation(2),
  lg: elevation(3),
} as const;

export const theme = { colors, spacing, radius, typography, shadows };

export default theme;
