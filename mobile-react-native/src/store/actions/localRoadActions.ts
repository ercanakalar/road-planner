import { roadService } from 'store/services/roadService';
import {
  localRoadsCleared,
  localRoadUploadFinished,
  localRoadUploadStarted,
} from 'store/slices/localRoadSlice';
import { showNotification } from 'services/notificationService';
import localRoadStorage from 'services/localRoadStorage';
import { LocalRoad } from 'types/local-road';
import { StopInput } from 'types/store/services/roadService-type';
import type { AppDispatch, RootState } from 'store';

const TITLE_MAX_LENGTH = 255;
const STOPS_MAX = 500;

interface UploadResult {
  uploaded: number;
  failed: number;
}

const toStopInput = (road: LocalRoad): StopInput[] =>
  road.stops.slice(0, STOPS_MAX).map((stop, index) => ({
    latitude: stop.latitude,
    longitude: stop.longitude,
    order: index + 1,
    address: stop.address,
  }));

export const uploadLocalRoads =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<UploadResult> => {
    const { localRoad, auth } = getState();
    const roads = localRoad.roads.filter((road) => road.stops.length > 0);

    if (!auth.isLoggedIn || roads.length === 0) {
      return { uploaded: 0, failed: 0 };
    }

    dispatch(localRoadUploadStarted());

    const uploadedIds: string[] = [];
    let failed = 0;

    for (const road of roads) {
      try {
        await dispatch(
          roadService.endpoints.createRoad.initiate({
            title: road.title.slice(0, TITLE_MAX_LENGTH) || 'Untitled route',
            description: road.description,
            stops: toStopInput(road),
          }),
        ).unwrap();
        uploadedIds.push(road.id);
      } catch {
        failed += 1;
      }
    }

    dispatch(localRoadUploadFinished({ uploadedIds }));

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

export const discardLocalRoads =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(localRoadsCleared());
    await localRoadStorage.clear();
  };
