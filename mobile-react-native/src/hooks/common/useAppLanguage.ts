import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLanguage } from 'i18n';
import { useSetLanguageMutation } from 'store/services/profileService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { languageSet } from 'store/slices/settingsSlice';
import { AppLanguage } from 'types/i18n';

interface AppLanguageState {
  language: AppLanguage;
  isChosen: boolean;
  setLanguage: (language: AppLanguage) => void;
}

export function useAppLanguage(): AppLanguageState {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const [tellTheAccount] = useSetLanguageMutation();

  const chosen = useAppSelector((state) => state.settings.language);
  const language = resolveLanguage(chosen);

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
  }, [i18n, language]);

  const setLanguage = useCallback(
    (next: AppLanguage) => {
      dispatch(languageSet(next));

      if (isLoggedIn) void tellTheAccount(next).unwrap().catch(() => {});
    },
    [dispatch, isLoggedIn, tellTheAccount],
  );

  return { language, isChosen: chosen !== null, setLanguage };
}

export default useAppLanguage;
