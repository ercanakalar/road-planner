import { useMemo } from 'react';

import { buildMapStyle } from 'constants/mapStyles';
import { useTheme } from 'theme';

/**
 * The basemap, in the app's current colours.
 *
 * Memoised per palette rather than per render: the style is a ~25-entry array
 * that react-native-maps hands across the bridge, and a new one every render
 * would re-style the map on every frame it re-renders in.
 */
export function useMapStyle() {
  const { colors, isDark } = useTheme();

  const mapStyle = useMemo(() => buildMapStyle(colors), [colors]);

  return { mapStyle, isDark };
}

export default useMapStyle;
