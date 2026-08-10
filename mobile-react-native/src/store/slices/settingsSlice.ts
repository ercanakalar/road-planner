import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ThemeMode } from 'types/theme';

export interface SettingsState {
  notificationsEnabled: boolean;
  autoFitRoute: boolean;
  themeMode: ThemeMode;
}

export const settingsInitialState: SettingsState = {
  notificationsEnabled: true,
  autoFitRoute: true,
  themeMode: 'system',
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
  },
});

export const { settingsRestored, settingToggled, settingSet, themeModeSet } =
  settingsSlice.actions;

export default settingsSlice.reducer;
