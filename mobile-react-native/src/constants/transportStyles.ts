import type { ThemeColors } from 'theme/palettes';
import { TransportMode } from 'types/transport-type';

export interface RouteLineStyle {
  color: string;
  casing: string;
  dashPattern?: number[];
  width: number;
}

export const createRouteLineStyles = (
  colors: ThemeColors,
): Record<TransportMode, RouteLineStyle> => ({
  driving: {
    color: colors.route,
    casing: colors.routeCasing,
    width: 5,
  },
  transit: {
    color: colors.transitRoute,
    casing: colors.transitRouteCasing,
    dashPattern: [18, 10],
    width: 5,
  },
  walking: {
    color: colors.walkingRoute,
    casing: colors.walkingRouteCasing,
    dashPattern: [2, 10],
    width: 6,
  },
});
