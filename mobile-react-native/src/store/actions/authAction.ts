import { authenticationService } from 'store/services/authenticationService';
import { roadService } from 'store/services/roadService';
import { profileService } from 'store/services/profileService';
import { favoriteService } from 'store/services/favoriteService';
import { AppDispatch } from 'store';

export const resetAllApiStates = () => (dispatch: AppDispatch) => {
  dispatch(authenticationService.util.resetApiState());
  dispatch(roadService.util.resetApiState());
  dispatch(profileService.util.resetApiState());
  dispatch(favoriteService.util.resetApiState());
};
