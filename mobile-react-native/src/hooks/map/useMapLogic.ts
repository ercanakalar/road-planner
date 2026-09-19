import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import {
  useAddStopMutation,
  useDeleteStopByIdMutation,
  useGetRouteByIdQuery,
  useUpdateStopByIdMutation,
} from 'store/services/routeService';
import { ShowRouteByIdRouteProp } from 'types/map-screen-type';
import { addressName } from 'utils/address';
import { RoutePlace } from 'services/mapsService';
import { showNotification } from 'services/notificationService';
import {
  MapLongPressEvent,
  MarkerDragEndEvent,
  OnPlaceSelected,
} from 'types/hooks/map/useMapLogic-type';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForStop,
  startDraggingStop,
  stopDraggingStop,
} from 'store/slices/mapSlice';
import { useRouteLine } from 'hooks/map/useRouteDirections';
import useRouteSearch from 'hooks/map/useRouteSearch';
import { TransportMode } from 'types/transport-type';
import { ContextMenuOption } from 'types/components/contextMenu';

const COORD_THRESHOLD = 0.0001;

const EMPTY_STOPS: never[] = [];

const useMapLogic = () => {
  const { params } = useRoute<ShowRouteByIdRouteProp>();
  const { routeId } = params;
  const dispatch = useAppDispatch();

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [transportMode, setTransportMode] = useState<TransportMode>('driving');

  const {
    clickedLocation,
    contextMenuStopId,
    isContextMenuVisible,
    draggingStopId,
  } = useAppSelector((state) => state.map);

  const { stops, route, isLoading } = useGetRouteByIdQuery(
    { routeId },
    {
      skip: !routeId,
      selectFromResult: ({ data, isLoading: loading }) => ({
        route: data,
        stops: data?.stops ?? EMPTY_STOPS,
        isLoading: loading,
      }),
    },
  );

  const { t } = useTranslation();

  const [addStop] = useAddStopMutation();
  const [deleteStop] = useDeleteStopByIdMutation();
  const [updateStop] = useUpdateStopByIdMutation();

  const routeLine = useRouteLine(stops, transportMode);
  const routeSearch = useRouteSearch(stops, transportMode);

  const contextMenuStop = useMemo(
    () =>
      contextMenuStopId
        ? stops.find((stop) => stop.id === contextMenuStopId)
        : undefined,
    [stops, contextMenuStopId],
  );

  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const handleMapLongPress = useCallback(
    (event: MapLongPressEvent) => {
      if (draggingStopId) return;
      bottomSheetRef.current?.collapse();

      const { coordinate } = event.nativeEvent;
      const pressed = stopsRef.current.find(
        (stop) =>
          Math.abs(stop.latitude - coordinate.latitude) <
            COORD_THRESHOLD &&
          Math.abs(stop.longitude - coordinate.longitude) <
            COORD_THRESHOLD,
      );

      dispatch(
        pressed
          ? openContextMenuForStop(pressed.id)
          : openContextMenuForLocation(coordinate),
      );
    },
    [dispatch, draggingStopId],
  );

  const handleAddStop = useCallback(async () => {
    if (!clickedLocation) return;
    dispatch(closeContextMenu());

    try {
      await addStop({
        routeId,
        stop: {
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          order: stopsRef.current.length + 1,
        },
      }).unwrap();
    } catch {
      showNotification({
        type: 'error',
        header: t('toast.error'),
        message: t('toast.failedToAddStop'),
      });
    }
  }, [addStop, clickedLocation, dispatch, routeId, t]);

  const handleDeleteStop = useCallback(async () => {
    if (!contextMenuStopId) return;
    dispatch(closeContextMenu());

    try {
      await deleteStop({
        routeId,
        stopId: contextMenuStopId,
      }).unwrap();
    } catch {
      showNotification({
        type: 'error',
        header: t('toast.error'),
        message: t('toast.failedToDeleteStop'),
      });
    }
  }, [contextMenuStopId, deleteStop, dispatch, routeId, t]);

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragEndEvent, stopId: string): Promise<void> => {
      if (draggingStopId !== stopId) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch(stopDraggingStop());

      try {
        await updateStop({
          routeId,
          stopId,
          stop: { latitude, longitude },
        }).unwrap();
      } catch {
        showNotification({
          type: 'error',
          header: t('toast.error'),
          message: t('toast.failedToMoveStop'),
        });
      }
    },
    [dispatch, draggingStopId, routeId, updateStop],
  );

  const handleNavigateToStop = useCallback(() => {
    if (!contextMenuStopId) return;
    dispatch(startDraggingStop(contextMenuStopId));
    showNotification({
      type: 'info',
      header: t('toast.dragToMove'),
      message: t('toast.dragHint'),
    });
  }, [contextMenuStopId, dispatch, t]);

  const handleCloseContextMenu = useCallback(
    () => dispatch(closeContextMenu()),
    [dispatch],
  );

  const handleMapPress = useCallback(() => {
    if (draggingStopId) dispatch(stopDraggingStop());
  }, [dispatch, draggingStopId]);

  const onPlaceSelected = useCallback<OnPlaceSelected>(
    ({ latitude, longitude }) => {
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
      dispatch(openContextMenuForLocation({ latitude, longitude }));
    },
    [dispatch],
  );

  const focusOnPlace = useCallback((place: RoutePlace) => {
    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
  }, []);

  const handleAddPlaceAsStop = useCallback(
    async (place: RoutePlace) => {
      try {
        await addStop({
          routeId,
          stop: {
            latitude: place.latitude,
            longitude: place.longitude,
            order: place.insertAfterIndex + 2,
          },
        }).unwrap();

        showNotification({
          type: 'success',
          header: t('toast.addedToRoute'),
          message: t('toast.placeIsNowAStop', { name: place.name }),
        });
      } catch {
        showNotification({
          type: 'error',
          header: t('toast.error'),
          message: t('toast.failedToAddStop'),
        });
      }
    },
    [addStop, routeId, t],
  );

  const contextMenuOptions = useMemo<ContextMenuOption[]>(
    () =>
      contextMenuStop
        ? [
            {
              label: t('mapUi.moveStop'),
              icon: 'navigate-outline',
              action: handleNavigateToStop,
            },
            {
              label: t('mapUi.deleteStop'),
              icon: 'trash-outline',
              tone: 'danger',
              action: handleDeleteStop,
            },
          ]
        : [
            {
              label: t('mapUi.addStopHere'),
              icon: 'add-circle-outline',
              action: handleAddStop,
            },
          ],
    [
      contextMenuStop,
      handleAddStop,
      handleDeleteStop,
      handleNavigateToStop,
    ],
  );

  const contextMenuProps = useMemo(
    () => ({
      visible: isContextMenuVisible,
      title: contextMenuStop
        ? addressName(contextMenuStop.address) || t('defaults.droppedPin')
        : t('defaults.droppedPin'),
      options: contextMenuOptions,
      onClose: handleCloseContextMenu,
    }),
    [
      contextMenuOptions,
      contextMenuStop,
      handleCloseContextMenu,
      isContextMenuVisible,
    ],
  );

  return {
    routeId,
    route,
    mapRef,
    bottomSheetRef,
    isLoading,
    stops,
    routeLine,
    routeSearch,
    transportMode,
    setTransportMode,
    draggingStopId,
    contextMenuProps,
    onPlaceSelected,
    focusOnPlace,
    handleAddPlaceAsStop,
    handleMarkerDragEnd,
    handleMapLongPress,
    handleMapPress,
  };
};

export default useMapLogic;
