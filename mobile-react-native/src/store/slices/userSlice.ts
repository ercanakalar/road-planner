import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { userInitialState, UserState } from 'types/store/user-type';

type ProfilePatch = Partial<UserState['data']>;

const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      state.data = action.payload.data;
      state.isLoading = action.payload.isLoading;
      state.error = action.payload.error;
    },
    clearUser() {
      return userInitialState;
    },
    updateUserProfile(state, action: PayloadAction<ProfilePatch>) {
      (Object.keys(action.payload) as (keyof ProfilePatch)[]).forEach((key) => {
        const value = action.payload[key];
        if (value !== undefined) {
          state.data = { ...state.data, [key]: value };
        }
      });
    },
  },
});

export const { setUser, clearUser, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
