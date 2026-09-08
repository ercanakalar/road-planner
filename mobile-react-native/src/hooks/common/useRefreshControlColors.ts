import { useMemo } from 'react';

import { useTheme } from 'theme';

export interface RefreshControlColors {
  tintColor: string;
  colors: string[];
  progressBackgroundColor: string;
}

export function useRefreshControlColors(): RefreshControlColors {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      tintColor: colors.primary,
      colors: [colors.primary],
      progressBackgroundColor: colors.surface,
    }),
    [colors],
  );
}

export default useRefreshControlColors;
