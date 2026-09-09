import { routeService } from 'store/services/routeService';
import {
  localRoutesCleared,
  localRouteUploadFinished,
  localRouteUploadStarted,
} from 'store/slices/localRouteSlice';
import { showNotification } from 'services/notificationService';
import localRouteStorage from 'services/localRouteStorage';
import { LocalRoute } from 'types/local-route';
import { StopInput } from 'types/store/services/routeService-type';
import type { AppDispatch, RootState } from 'store';

const TITLE_MAX_LENGTH = 255;
const STOPS_MAX = 500;

interface UploadResult {
  uploaded: number;
  failed: number;
}

const toStopInput = (route: LocalRoute): StopInput[] =>
  route.stops.slice(0, STOPS_MAX).map((stop, index) => ({
    latitude: stop.latitude,
    longitude: stop.longitude,
    order: index + 1,
    address: stop.address,
  }));

export const uploadLocalRoutes =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<UploadResult> => {
    const { localRoute, auth } = getState();
    const routes = localRoute.routes.filter((route) => route.stops.length > 0);

    if (!auth.isLoggedIn || routes.length === 0) {
      return { uploaded: 0, failed: 0 };
    }

    dispatch(localRouteUploadStarted());

    const uploadedIds: string[] = [];
    let failed = 0;

    for (const route of routes) {
      try {
        await dispatch(
          routeService.endpoints.createRoute.initiate({
            title: route.title.slice(0, TITLE_MAX_LENGTH) || 'Untitled route',
            description: route.description,
            stops: toStopInput(route),
          }),
        ).unwrap();
        uploadedIds.push(route.id);
      } catch {
        failed += 1;
      }
    }

    dispatch(localRouteUploadFinished({ uploadedIds }));

    if (uploadedIds.length > 0) {
      showNotification({
        type: 'success',
        header: 'Routes saved',
        message: `${uploadedIds.length} route${
          uploadedIds.length === 1 ? '' : 's'
        } added to your account.`,
      });
    }

    if (failed > 0) {
      showNotification({
        type: 'error',
        header: 'Some routes failed',
        message: `${failed} route${
          failed === 1 ? '' : 's'
        } stayed on this device. Try again later.`,
      });
    }

    return { uploaded: uploadedIds.length, failed };
  };

export const discardLocalRoutes =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(localRoutesCleared());
    await localRouteStorage.clear();
  };
