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

/**
 * Which language the notice opens in: the one a consent was last given in, so
 * the text someone re-reads is the text they agreed to. Failing that, whatever
 * the app is showing — which is the phone's language until somebody picks one.
 *
 * The notice is a legal text with its own toggle above it, so this is only the
 * starting point, and a wrong guess still costs one tap.
 */
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
