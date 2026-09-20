import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { summarisedCounts } from 'constants/travelMap';
import { MarkedArea } from 'types/travel-map';

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
