import { routeService } from 'store/services/routeService';
import type { AppDispatch } from 'store';

// Changes a saved route's name, description or visibility. No stops are
// sent, so the server leaves them exactly as they are — including any added
// on another device since this one last loaded the route.
export const updateRouteDetails =
  ({
    routeId,
    title,
    description,
    isPublic,
  }: {
    routeId: string;
    title: string;
    description: string;
    isPublic?: boolean;
  }) =>
  async (dispatch: AppDispatch): Promise<void> => {
    await dispatch(
      routeService.endpoints.updateRouteById.initiate({
        routeId,
        title,
        description,
        ...(isPublic === undefined ? {} : { isPublic }),
      }),
    ).unwrap();
  };
