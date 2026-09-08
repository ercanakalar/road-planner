import { roadService } from 'store/services/roadService';
import { StopWithAddress } from 'types/map-screen-type';
import { StopInput } from 'types/store/services/roadService-type';
import type { AppDispatch } from 'store';

class RoadDetailsUpdateError extends Error {}

const toStopInput = (stop: StopWithAddress): StopInput => ({
  id: stop.id,
  latitude: stop.latitude,
  longitude: stop.longitude,
  order: stop.order,
  address: stop.address,
});

export const updateRoadDetails =
  ({
    roadId,
    title,
    description,
    isPublic,
  }: {
    roadId: string;
    title: string;
    description: string;
    isPublic?: boolean;
  }) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const road = await dispatch(
      roadService.endpoints.getRoadById.initiate(
        { roadId },
        { forceRefetch: false },
      ),
    ).unwrap();

    if (!road) {
      throw new RoadDetailsUpdateError(
        'Could not load the route to update it.',
      );
    }

    await dispatch(
      roadService.endpoints.updateRoadById.initiate({
        roadId,
        title,
        description,
        ...(isPublic === undefined ? {} : { isPublic }),
        stops: (road.stops ?? []).map(toStopInput),
      }),
    ).unwrap();
  };
