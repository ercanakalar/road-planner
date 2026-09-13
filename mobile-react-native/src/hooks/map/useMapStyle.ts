import { useMemo } from 'react';

import { buildMapStyle } from 'constants/mapStyles';
import { useTheme } from 'theme';

/**
 * The basemap, in the app's current colours.
 *
 * Memoised per palette rather than per render: the style is a ~25-entry array
 * that react-native-maps hands across the bridge, and a new one every render
 * would re-style the map on every frame it re-renders in.
 *
 * `mapKey` is the key every MapView in the app must carry. `userInterfaceStyle`
 * is a creation-time prop, not a live one: on Android react-native-maps folds
 * it into the `GoogleMapOptions` the map is built from and then ignores every
 * later change (`MapViewManager.setUserInterfaceStyle` is a deliberate no-op),
 * so a map created in the dark theme keeps Google's dark base for the rest of
 * its life however the JSON style is restyled over it. Keying the MapView on
 * the scheme rebuilds it on the one event that needs a rebuild — the theme
 * changing — and never otherwise.
 */
export function useMapStyle() {
  const { colors, isDark, scheme } = useTheme();

  const mapStyle = useMemo(() => buildMapStyle(colors), [colors]);

  return { mapStyle, isDark, mapKey: scheme };
}

export default useMapStyle;
