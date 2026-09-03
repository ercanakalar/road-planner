import { Platform, ViewStyle } from 'react-native';

export { darkColors, lightColors, palettes } from './palettes';
export type { ThemeColors } from './palettes';
export {
  ThemeProvider,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
  resolveScheme,
} from './ThemeProvider';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.05,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: 0,
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
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
      shadowColor: '#202124',
      shadowOffset: { width: 0, height: level * 2 },
      shadowOpacity: 0.05 + level * 0.03,
      shadowRadius: level * 6,
    },
    default: { elevation: level * 2 },
  })!;

export const shadows = {
  sm: elevation(1),
  md: elevation(2),
  lg: elevation(3),
} as const;

export const theme = { spacing, radius, typography, shadows };

export default theme;
