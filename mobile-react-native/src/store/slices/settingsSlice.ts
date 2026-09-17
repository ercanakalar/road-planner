import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AppLanguage } from 'types/i18n';
import { ThemeMode } from 'types/theme';

export interface SettingsState {
  notificationsEnabled: boolean;
  autoFitRoute: boolean;
  themeMode: ThemeMode;
  /**
   * The language somebody chose, or null for "never chosen".
   *
   * Null is what every install starts at, and it means follow the phone. Once
   * this holds a language it outranks the phone for good — which is the
   * difference between a default and a decision.
   */
  language: AppLanguage | null;
}

export const settingsInitialState: SettingsState = {
  notificationsEnabled: true,
  autoFitRoute: true,
  themeMode: 'system',
  language: null,
};

export type SettingKey = {
  [K in keyof SettingsState]: SettingsState[K] extends boolean ? K : never;
}[keyof SettingsState];

const settingsSlice = createSlice({
  name: 'settings',
  initialState: settingsInitialState,
  reducers: {
    settingsRestored(state, action: PayloadAction<Partial<SettingsState>>) {
      return { ...state, ...action.payload };
    },
    settingToggled(state, action: PayloadAction<SettingKey>) {
      state[action.payload] = !state[action.payload];
    },
    settingSet(
      state,
      action: PayloadAction<{ key: SettingKey; value: boolean }>,
    ) {
      state[action.payload.key] = action.payload.value;
    },
    themeModeSet(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    languageSet(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },
  },
});

export const {
  settingsRestored,
  settingToggled,
  settingSet,
  themeModeSet,
  languageSet,
} = settingsSlice.actions;

export default settingsSlice.reducer;
