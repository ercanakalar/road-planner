import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  },
  //   extraReducers: (builder: any) => {
  //     const { getUser } = profileService.endpoints;
  //     builder
  //       .addMatcher(getUser.matchFulfilled, (state: UserState, action: any) => {
  //         console.log('User data fetched:', action.payload);
  //         state.data = action.payload.data;
  //         state.isLoading = false;
  //         state.error = null;
  //       })
  //       .addMatcher(getUser.matchRejected, (state: UserState, action: any) => {
  //         console.error('Error fetching user data:', action.error);
  //         state.isLoading = false;
  //         state.error = action.error.message || 'Failed to fetch user data';
  //       });
  //   },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
