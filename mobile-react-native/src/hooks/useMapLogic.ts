import { useCallback, useMemo, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import {
  useAddWaypointMutation,
  useDeleteWaypointByIdMutation,
  useGetRoadByIdQuery,
  useUpdateWaypointByIdMutation,
} from 'store/services/roadService';
import { ShowRouteByIdRouteProp } from 'types/map-screen-type';
import { showNotification } from 'services/notificationService';
import { reverseGeocode } from 'services/googleMapsService';
import {
  MapLongPressEvent,
  MarkerDragEndEvent,
  OnPlaceSelected,
} from 'types/hooks/useMapLogic-type';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForWaypoint,
  startDraggingWaypoint,
  stopDraggingWaypoint,
} from 'store/slices/mapSlice';
import { useRouteLine } from 'hooks/useRouteDirections';
import { TransportMode } from 'types/transport-type';
import { ContextMenuOption } from 'types/components/contextMenu';

const COORD_THRESHOLD = 0.0001;

const EMPTY_WAYPOINTS: never[] = [];

const useMapLogic = () => {
  const { params } = useRoute<ShowRouteByIdRouteProp>();
  const { roadId } = params;
  const dispatch = useAppDispatch();

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [transportMode, setTransportMode] = useState<TransportMode>('driving');

  const {
    clickedLocation,
    contextMenuWaypointId,
    isContextMenuVisible,
    draggingWaypointId,
  } = useAppSelector((state) => state.map);

  const { waypoints, road, isLoading } = useGetRoadByIdQuery(
    { roadId },
    {
      skip: !roadId,
      selectFromResult: ({ data, isLoading: loading }) => ({
        road: data,
        waypoints: data?.wayPoints ?? EMPTY_WAYPOINTS,
        isLoading: loading,
      }),
    },
  );

  const [addWaypoint] = useAddWaypointMutation();
  const [deleteWaypoint] = useDeleteWaypointByIdMutation();
  const [updateWaypoint] = useUpdateWaypointByIdMutation();

  const routeLine = useRouteLine(waypoints, transportMode);

  const contextMenuWaypoint = useMemo(
    () =>
      contextMenuWaypointId
        ? waypoints.find((waypoint) => waypoint.id === contextMenuWaypointId)
        : undefined,
    [waypoints, contextMenuWaypointId],
  );

  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  const handleMapLongPress = useCallback(
    (event: MapLongPressEvent) => {
      if (draggingWaypointId) return;
      bottomSheetRef.current?.collapse();

      const { coordinate } = event.nativeEvent;
      const pressed = waypointsRef.current.find(
        (waypoint) =>
          Math.abs(waypoint.latitude - coordinate.latitude) < COORD_THRESHOLD &&
          Math.abs(waypoint.longitude - coordinate.longitude) < COORD_THRESHOLD,
      );

      dispatch(
        pressed
          ? openContextMenuForWaypoint(pressed.id)
          : openContextMenuForLocation(coordinate),
      );
    },
    [dispatch, draggingWaypointId],
  );

  const handleAddWaypoint = useCallback(async () => {
    if (!clickedLocation) return;
    dispatch(closeContextMenu());

    try {
      const address = await reverseGeocode(clickedLocation);
      await addWaypoint({
        roadId,
        waypoint: {
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          order: waypointsRef.current.length + 1,
          address,
        },
      }).unwrap();
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to add waypoint.',
      });
    }
  }, [addWaypoint, clickedLocation, dispatch, roadId]);

  const handleDeleteWaypoint = useCallback(async () => {
    if (!contextMenuWaypointId) return;
    dispatch(closeContextMenu());

    try {
      await deleteWaypoint({
        roadId,
        waypointId: contextMenuWaypointId,
      }).unwrap();
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to delete waypoint.',
      });
    }
  }, [contextMenuWaypointId, deleteWaypoint, dispatch, roadId]);

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragEndEvent, waypointId: string): Promise<void> => {
      if (draggingWaypointId !== waypointId) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch(stopDraggingWaypoint());

      try {
        const address = await reverseGeocode({ latitude, longitude });
        await updateWaypoint({
          roadId,
          waypointId,
          waypoint: { latitude, longitude, address },
        }).unwrap();
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Failed to update waypoint location.',
        });
      }
    },
    [dispatch, draggingWaypointId, roadId, updateWaypoint],
  );

  const handleNavigateToWaypoint = useCallback(() => {
    if (!contextMenuWaypointId) return;
    dispatch(startDraggingWaypoint(contextMenuWaypointId));
    showNotification({
      type: 'info',
      header: 'Drag to move',
      message: 'Drag the highlighted pin to its new position.',
    });
  }, [contextMenuWaypointId, dispatch]);

  const handleCloseContextMenu = useCallback(
    () => dispatch(closeContextMenu()),
    [dispatch],
  );

  const handleMapPress = useCallback(() => {
    if (draggingWaypointId) dispatch(stopDraggingWaypoint());
  }, [dispatch, draggingWaypointId]);

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

  const contextMenuOptions = useMemo<ContextMenuOption[]>(
    () =>
      contextMenuWaypoint
        ? [
            {
              label: 'Move waypoint',
              icon: 'navigate-outline',
              action: handleNavigateToWaypoint,
            },
            {
              label: 'Delete waypoint',
              icon: 'trash-outline',
              tone: 'danger',
              action: handleDeleteWaypoint,
            },
          ]
        : [
            {
              label: 'Add waypoint here',
              icon: 'add-circle-outline',
              action: handleAddWaypoint,
            },
          ],
    [
      contextMenuWaypoint,
      handleAddWaypoint,
      handleDeleteWaypoint,
      handleNavigateToWaypoint,
    ],
  );

  const contextMenuProps = useMemo(
    () => ({
      visible: isContextMenuVisible,
      title: contextMenuWaypoint
        ? contextMenuWaypoint.address?.address
        : 'Dropped pin',
      options: contextMenuOptions,
      onClose: handleCloseContextMenu,
    }),
    [
      contextMenuOptions,
      contextMenuWaypoint,
      handleCloseContextMenu,
      isContextMenuVisible,
    ],
  );

  return {
    roadId,
    road,
    mapRef,
    bottomSheetRef,
    isLoading,
    waypoints,
    routeLine,
    transportMode,
    setTransportMode,
    draggingWaypointId,
    contextMenuProps,
    onPlaceSelected,
    handleMarkerDragEnd,
    handleMapLongPress,
    handleMapPress,
  };
};

export default useMapLogic;
