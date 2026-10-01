import { authenticationService } from 'store/services/authenticationService';
import { routeService } from 'store/services/routeService';
import { profileService } from 'store/services/profileService';
import { favoriteService } from 'store/services/favoriteService';
import { notificationService } from 'store/services/notificationService';
import { searchService } from 'store/services/searchService';
import { consentService } from 'store/services/consentService';
import { statisticsService } from 'store/services/statisticsService';
import type { AppDispatch } from 'store';

// Everything cached here belonged to whoever was signed in. Nothing of it may
// outlive their session — least of all after their account has been deleted.
export const resetAllApiStates = () => (dispatch: AppDispatch) => {
  dispatch(authenticationService.util.resetApiState());
  dispatch(routeService.util.resetApiState());
  dispatch(profileService.util.resetApiState());
  dispatch(favoriteService.util.resetApiState());
  dispatch(notificationService.util.resetApiState());
  dispatch(searchService.util.resetApiState());
  dispatch(consentService.util.resetApiState());
  dispatch(statisticsService.util.resetApiState());
};
