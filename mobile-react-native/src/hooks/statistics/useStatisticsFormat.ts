import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, isAppLanguage } from 'types/i18n';
import { countParts, formatDay } from 'utils/statistics';

export function useStatisticsFormat() {
  const { t, i18n } = useTranslation();
  const language = isAppLanguage(i18n.language)
    ? i18n.language
    : DEFAULT_LANGUAGE;

  const count = useCallback(
    (value: number): string => {
      const parts = countParts(value, language);
      if (parts.kind === 'plain') return parts.text;

      return t(
        parts.kind === 'thousands'
          ? 'statistics.compactThousands'
          : 'statistics.compactMillions',
        { value: parts.value },
      );
    },
    [language, t],
  );

  const day = useCallback(
    (iso: string, month: 'short' | 'long' = 'short') =>
      formatDay(iso, language, month),
    [language],
  );

  return { count, day, language };
}

export default useStatisticsFormat;
