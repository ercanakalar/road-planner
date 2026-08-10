import { roadService } from 'store/services/roadService';
import { WaypointWithAddress } from 'types/map-screen-type';
import { WaypointInput } from 'types/store/services/roadService-type';
import type { AppDispatch } from 'store';

export class RoadDetailsUpdateError extends Error {}

const toWaypointInput = (waypoint: WaypointWithAddress): WaypointInput => ({
  id: waypoint.id,
  latitude: waypoint.latitude,
  longitude: waypoint.longitude,
  order: waypoint.order,
  address: {
    address: waypoint.address?.address ?? '',
    country: waypoint.address?.country ?? '',
    province: waypoint.address?.province ?? '',
    district: waypoint.address?.district ?? '',
  },
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
        waypoints: (road.wayPoints ?? []).map(toWaypointInput),
      }),
    ).unwrap();
  };
