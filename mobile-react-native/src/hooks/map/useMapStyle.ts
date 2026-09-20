import { useMemo } from 'react';

import { buildMapStyle } from 'constants/mapStyles';
import { useTheme } from 'theme';

export function useMapStyle() {
  const { colors, isDark, scheme } = useTheme();

  const mapStyle = useMemo(() => buildMapStyle(colors), [colors]);

  return { mapStyle, isDark, mapKey: scheme };
}

export default useMapStyle;
