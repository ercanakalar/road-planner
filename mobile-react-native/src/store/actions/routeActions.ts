import { routeService } from 'store/services/routeService';
import { StopWithAddress } from 'types/map-screen-type';
import { StopInput } from 'types/store/services/routeService-type';
import type { AppDispatch } from 'store';
import i18n from 'i18n';

class RouteDetailsUpdateError extends Error {}

const toStopInput = (stop: StopWithAddress): StopInput => ({
  id: stop.id,
  latitude: stop.latitude,
  longitude: stop.longitude,
  order: stop.order,
  address: stop.address,
});

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
    const route = await dispatch(
      routeService.endpoints.getRouteById.initiate(
        { routeId },
        { forceRefetch: false },
      ),
    ).unwrap();

    if (!route) {
      throw new RouteDetailsUpdateError(
        i18n.t('errors.couldNotLoadRouteToUpdate'),
      );
    }

    await dispatch(
      routeService.endpoints.updateRouteById.initiate({
        routeId,
        title,
        description,
        ...(isPublic === undefined ? {} : { isPublic }),
        stops: (route.stops ?? []).map(toStopInput),
      }),
    ).unwrap();
  };
