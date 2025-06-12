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
    // const { getUser, updateUser } = profileService.endpoints;
    // builder
    //   .addMatcher(getUser.matchFulfilled, (state: UserState, action: any) => {
    //     // console.log('User data fetched:', action.payload);
    //     state.data = action.payload.data;
    //     state.isLoading = false;
    //     state.error = null;
    //   })
    //   .addMatcher(getUser.matchRejected, (state: UserState, action: any) => {
    //     console.error('Error fetching user data:', action.error);
    //     state.isLoading = false;
    //     state.error = action.error.message || 'Failed to fetch user data';
    //   })
    //   .addMatcher(
    //     updateUser.matchFulfilled,
    //     (state: UserState, action: any) => {
    //       // console.log('User data updated:', action.payload);
    //       state.data = action.payload.data;
    //       state.isLoading = false;
    //       state.error = null;
    //     }
    //   )
    //   .addMatcher(updateUser.matchRejected, (state: UserState, action: any) => {
    //     console.error('Error fetching user data:', action.error);
    //     state.isLoading = false;
    //     state.error = action.error.message || 'Failed to fetch user data';
    //   });
  },
});

export const { setUser, clearUser, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
