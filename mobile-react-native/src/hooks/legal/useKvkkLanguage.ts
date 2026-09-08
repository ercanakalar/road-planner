import { useState } from 'react';

import { KVKK_COPY, deviceKvkkLanguage } from 'constants/kvkk';
import { useAppSelector } from 'store/hook';
import { KvkkCopy, KvkkLanguage } from 'types/kvkk';

interface KvkkLanguageState {
  language: KvkkLanguage;
  copy: KvkkCopy;
  setLanguage: (language: KvkkLanguage) => void;
}

/**
 * Which language the notice opens in: the one a consent was last given in, so
 * the text someone re-reads is the text they agreed to, otherwise the phone's.
 */
export function useKvkkLanguage(): KvkkLanguageState {
  const acceptedIn = useAppSelector((state) => state.kvkk.consent?.language);
  const [language, setLanguage] = useState<KvkkLanguage>(
    () => acceptedIn ?? deviceKvkkLanguage(),
  );

  return { language, copy: KVKK_COPY[language], setLanguage };
}

export default useKvkkLanguage;
