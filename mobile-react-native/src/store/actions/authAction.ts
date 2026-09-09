import { authenticationService } from 'store/services/authenticationService';
import { routeService } from 'store/services/routeService';
import { profileService } from 'store/services/profileService';
import { favoriteService } from 'store/services/favoriteService';
import type { AppDispatch } from 'store';

export const resetAllApiStates = () => (dispatch: AppDispatch) => {
  dispatch(authenticationService.util.resetApiState());
  dispatch(routeService.util.resetApiState());
  dispatch(profileService.util.resetApiState());
  dispatch(favoriteService.util.resetApiState());
};
