import { useState } from 'react';

import { KVKK_COPY, deviceKvkkLanguage } from 'constants/kvkk';
import useAppLanguage from 'hooks/common/useAppLanguage';
import { useAppSelector } from 'store/hook';
import { KvkkCopy, KvkkLanguage } from 'types/kvkk';

interface KvkkLanguageState {
  language: KvkkLanguage;
  copy: KvkkCopy;
  setLanguage: (language: KvkkLanguage) => void;
}

export function useKvkkLanguage(): KvkkLanguageState {
  const acceptedIn = useAppSelector((state) => state.kvkk.consent?.language);
  const { language: appLanguage } = useAppLanguage();

  const [language, setLanguage] = useState<KvkkLanguage>(
    () =>
      acceptedIn ??
      (appLanguage === 'tr' || appLanguage === 'en'
        ? appLanguage
        : deviceKvkkLanguage()),
  );

  return { language, copy: KVKK_COPY[language], setLanguage };
}

export default useKvkkLanguage;
