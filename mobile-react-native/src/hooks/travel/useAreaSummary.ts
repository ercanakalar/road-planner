import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { summarisedCounts } from 'constants/travelMap';
import { MarkedArea } from 'types/travel-map';

/**
 * How much of the map has been coloured in, in words — "3 countries · 12
 * cities", or nothing at all for a map holding only districts and single
 * places, where the caller says the plain total instead.
 */
export function useAreaSummary(areas: readonly MarkedArea[]): string {
  const { t } = useTranslation();

  return useMemo(
    () =>
      summarisedCounts(areas)
        .map(({ key, count }) => t(key, { count }))
        .join(' · '),
    [areas, t],
  );
}

export default useAreaSummary;
