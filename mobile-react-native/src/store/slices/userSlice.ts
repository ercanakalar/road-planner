import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { profileService } from 'store/services/profileService';
import { userInitialState, UserState } from 'types/store/user-type';

const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      state.data = action.payload.data;
      state.isLoading = action.payload.isLoading;
      state.error = action.payload.error;
    },
    clearUser(state) {
      Object.assign(state, userInitialState);
    },
    updateUserProfile(
      state,
      action: PayloadAction<{
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        photo?: string;
        nickName?: string;
      }>
    ) {
      const { id, firstName, lastName, email, photo, nickName } =
        action.payload;
      if (id) state.data.id = id;
      if (firstName) state.data.firstName = firstName;
      if (lastName) state.data.lastName = lastName;
      if (email) state.data.email = email;
      if (photo) state.data.photo = photo;
      if (nickName) state.data.nickName = nickName;
    },
  },
  extraReducers: (builder: any) => {
  },
});

export const { setUser, clearUser, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
