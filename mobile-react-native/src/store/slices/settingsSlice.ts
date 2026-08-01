import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  notificationsEnabled: boolean;
  autoFitRoute: boolean;
}

export const settingsInitialState: SettingsState = {
  notificationsEnabled: true,
  autoFitRoute: true,
};

export type SettingKey = keyof SettingsState;

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
  },
});

export const { settingsRestored, settingToggled, settingSet } =
  settingsSlice.actions;

export default settingsSlice.reducer;
