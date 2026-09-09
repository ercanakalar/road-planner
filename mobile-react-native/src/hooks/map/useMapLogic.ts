import { useCallback, useMemo, useRef, useState } from 'react';
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
        header: 'Error',
        message: 'Failed to add stop.',
      });
    }
  }, [addStop, clickedLocation, dispatch, routeId]);

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
        header: 'Error',
        message: 'Failed to delete stop.',
      });
    }
  }, [contextMenuStopId, deleteStop, dispatch, routeId]);

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
          header: 'Error',
          message: 'Failed to update stop location.',
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
      header: 'Drag to move',
      message: 'Drag the highlighted pin to its new position.',
    });
  }, [contextMenuStopId, dispatch]);

  const handleCloseContextMenu = useCallback(
    () => dispatch(closeContextMenu()),
    [dispatch],
  );

  const handleMapPress = useCallback(() => {
    if (draggingStopId) dispatch(stopDraggingStop());
  }, [dispatch, draggingStopId]);

  const onPlaceSelected = useCallback<OnPlaceSelected>(
    (location) => {
      mapRef.current?.animateToRegion(
        {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
      dispatch(
        openContextMenuForLocation({
          latitude: location.lat,
          longitude: location.lng,
        }),
      );
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
          header: 'Added to your route',
          message: `${place.name} is now a stop on this route.`,
        });
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Failed to add stop.',
        });
      }
    },
    [addStop, routeId],
  );

  const contextMenuOptions = useMemo<ContextMenuOption[]>(
    () =>
      contextMenuStop
        ? [
            {
              label: 'Move stop',
              icon: 'navigate-outline',
              action: handleNavigateToStop,
            },
            {
              label: 'Delete stop',
              icon: 'trash-outline',
              tone: 'danger',
              action: handleDeleteStop,
            },
          ]
        : [
            {
              label: 'Add stop here',
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
        ? addressName(contextMenuStop.address) || 'Dropped pin'
        : 'Dropped pin',
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
