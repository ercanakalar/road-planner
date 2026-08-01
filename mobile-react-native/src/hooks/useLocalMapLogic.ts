import { useCallback, useMemo, useRef, useState } from 'react';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import { reverseGeocode } from 'services/googleMapsService';
import { showNotification } from 'services/notificationService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForWaypoint,
  startDraggingWaypoint,
  stopDraggingWaypoint,
} from 'store/slices/mapSlice';
import {
  localWaypointAdded,
  localWaypointDeleted,
  localWaypointMoved,
  localWaypointsReordered,
} from 'store/slices/localRoadSlice';
import { useRouteLine } from 'hooks/useRouteDirections';
import {
  MapLongPressEvent,
  MarkerDragEndEvent,
  OnPlaceSelected,
} from 'types/hooks/useMapLogic-type';
import { LocalRoad, LocalWaypoint } from 'types/local-road';
import { WaypointWithAddress } from 'types/map-screen-type';
import { ContextMenuOption } from 'types/components/contextMenu';
import { TransportMode } from 'types/transport-type';

const COORD_THRESHOLD = 0.0001;
const EMPTY_WAYPOINTS: WaypointWithAddress[] = [];

const toSharedWaypoint = (
  waypoint: LocalWaypoint,
  roadId: string,
): WaypointWithAddress => ({
  id: waypoint.id,
  latitude: waypoint.latitude,
  longitude: waypoint.longitude,
  order: waypoint.order,
  roadId,
  addressInfoId: '',
  address: { id: waypoint.id, ...waypoint.address },
  createdAt: '',
  updatedAt: '',
  favoriteWaypoints: [],
});

export const selectActiveLocalRoad = (
  roads: LocalRoad[],
  activeRoadId?: string,
): LocalRoad | undefined =>
  roads.find((road) => road.id === activeRoadId) ?? roads[0];

const useLocalMapLogic = () => {
  const dispatch = useAppDispatch();

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [isSavingPin, setIsSavingPin] = useState(false);

  const {
    clickedLocation,
    contextMenuWaypointId,
    isContextMenuVisible,
    draggingWaypointId,
  } = useAppSelector((state) => state.map);

  const roads = useAppSelector((state) => state.localRoad.roads);
  const activeRoadId = useAppSelector((state) => state.localRoad.activeRoadId);
  const isHydrated = useAppSelector((state) => state.localRoad.isHydrated);

  const activeRoad = useMemo(
    () => selectActiveLocalRoad(roads, activeRoadId),
    [roads, activeRoadId],
  );

  const waypoints = useMemo(
    () =>
      activeRoad
        ? activeRoad.wayPoints.map((waypoint) =>
            toSharedWaypoint(waypoint, activeRoad.id),
          )
        : EMPTY_WAYPOINTS,
    [activeRoad],
  );

  const routeLine = useRouteLine(waypoints, transportMode);

  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  const contextMenuWaypoint = useMemo(
    () =>
      contextMenuWaypointId
        ? waypoints.find((waypoint) => waypoint.id === contextMenuWaypointId)
        : undefined,
    [waypoints, contextMenuWaypointId],
  );

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
    setIsSavingPin(true);

    try {
      const address = await reverseGeocode(clickedLocation);
      dispatch(
        localWaypointAdded({
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          address,
        }),
      );
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Could not look up that place.',
      });
    } finally {
      setIsSavingPin(false);
    }
  }, [clickedLocation, dispatch]);

  const handleDeleteWaypoint = useCallback(() => {
    if (!contextMenuWaypointId) return;
    dispatch(closeContextMenu());
    dispatch(localWaypointDeleted(contextMenuWaypointId));
  }, [contextMenuWaypointId, dispatch]);

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragEndEvent, waypointId: string): Promise<void> => {
      if (draggingWaypointId !== waypointId) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch(stopDraggingWaypoint());

      try {
        const address = await reverseGeocode({ latitude, longitude });
        dispatch(
          localWaypointMoved({ waypointId, latitude, longitude, address }),
        );
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not look up that place.',
        });
      }
    },
    [dispatch, draggingWaypointId],
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

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) =>
      dispatch(localWaypointsReordered({ from, to })),
    [dispatch],
  );

  const handleDeleteWaypointById = useCallback(
    (waypointId: string) => dispatch(localWaypointDeleted(waypointId)),
    [dispatch],
  );

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
    mapRef,
    bottomSheetRef,
    isHydrated,
    isSavingPin,
    activeRoad,
    roads,
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
    handleReorder,
    handleDeleteWaypointById,
  };
};

export default useLocalMapLogic;
