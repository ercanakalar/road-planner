import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLanguage } from 'i18n';
import { useSetLanguageMutation } from 'store/services/profileService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { languageSet } from 'store/slices/settingsSlice';
import { AppLanguage } from 'types/i18n';

interface AppLanguageState {
  /** What is on screen, whether it was chosen or inherited from the phone. */
  language: AppLanguage;
  /** False until somebody picks one, which is what "follow the phone" means. */
  isChosen: boolean;
  setLanguage: (language: AppLanguage) => void;
}

/**
 * Keeps i18next showing whatever the store says.
 *
 * The store is the one that persists, so it leads and i18next follows. Driving
 * it the other way would put the language in two places that have to agree, and
 * only one of them survives being closed.
 */
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

      // The app is already showing the new language by the time this lands:
      // it is for the emails, which have no request behind them to read a
      // language off. Nothing waits on it, and a failure changes nothing on
      // screen — the next sign-in notes it again.
      if (isLoggedIn) void tellTheAccount(next).unwrap().catch(() => {});
    },
    [dispatch, isLoggedIn, tellTheAccount],
  );

  return { language, isChosen: chosen !== null, setLanguage };
}

export default useAppLanguage;
