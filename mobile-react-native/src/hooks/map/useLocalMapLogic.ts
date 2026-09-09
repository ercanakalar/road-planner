import { useCallback, useMemo, useRef, useState } from 'react';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import { RoutePlace, reverseGeocode } from 'services/mapsService';
import { addressName } from 'utils/address';
import { showNotification } from 'services/notificationService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForStop,
  startDraggingStop,
  stopDraggingStop,
} from 'store/slices/mapSlice';
import {
  localStopAdded,
  localStopDeleted,
  localStopFavoriteToggled,
  localStopMoved,
  localStopsReordered,
} from 'store/slices/localRoadSlice';
import {
  useRouteLine,
  useRouteTerrain,
} from 'hooks/map/useRouteDirections';
import useRouteSearch from 'hooks/map/useRouteSearch';
import {
  MapLongPressEvent,
  MarkerDragEndEvent,
  OnPlaceSelected,
} from 'types/hooks/map/useMapLogic-type';
import { LocalRoad, LocalStop } from 'types/local-road';
import { UNSHAPED_STOP } from 'utils/stopShape';
import { StopWithAddress } from 'types/map-screen-type';
import { ContextMenuOption } from 'types/components/contextMenu';
import { TransportMode } from 'types/transport-type';

const COORD_THRESHOLD = 0.0001;
const EMPTY_STOPS: StopWithAddress[] = [];

const toSharedStop = (
  stop: LocalStop,
  roadId: string,
): StopWithAddress => ({
  // A route kept on this device has never been through the server, so nothing
  // has measured the ground under it or the angle it turns through.
  ...UNSHAPED_STOP,
  elevation: null,
  id: stop.id,
  latitude: stop.latitude,
  longitude: stop.longitude,
  order: stop.order,
  roadId,
  address: stop.address,
  createdAt: '',
  updatedAt: '',
  favoriteStops: stop.isFavorite
    ? [
        {
          id: stop.id,
          userId: '',
          stopsId: stop.id,
          createdAt: '',
          updatedAt: '',
        },
      ]
    : [],
});

const selectActiveLocalRoad = (
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
    contextMenuStopId,
    isContextMenuVisible,
    draggingStopId,
  } = useAppSelector((state) => state.map);

  const roads = useAppSelector((state) => state.localRoad.roads);
  const activeRoadId = useAppSelector((state) => state.localRoad.activeRoadId);
  const isHydrated = useAppSelector((state) => state.localRoad.isHydrated);

  const activeRoad = useMemo(
    () => selectActiveLocalRoad(roads, activeRoadId),
    [roads, activeRoadId],
  );

  const stops = useMemo(
    () =>
      activeRoad
        ? activeRoad.stops.map((stop) =>
            toSharedStop(stop, activeRoad.id),
          )
        : EMPTY_STOPS,
    [activeRoad],
  );

  const routeLine = useRouteLine(stops, transportMode);

  // The list wants the road's own shape at each stop; everything else here
  // works off `stops`, whose identity the drag and reorder handlers depend on.
  const measuredStops = useRouteTerrain(stops, transportMode);
  const routeSearch = useRouteSearch(stops, transportMode);

  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const contextMenuStop = useMemo(
    () =>
      contextMenuStopId
        ? stops.find((stop) => stop.id === contextMenuStopId)
        : undefined,
    [stops, contextMenuStopId],
  );

  const handleMapLongPress = useCallback(
    (event: MapLongPressEvent) => {
      if (draggingStopId) return;
      bottomSheetRef.current?.collapse();

      const { coordinate } = event.nativeEvent;
      const pressed = stopsRef.current.find(
        (stop) =>
          Math.abs(stop.latitude - coordinate.latitude) < COORD_THRESHOLD &&
          Math.abs(stop.longitude - coordinate.longitude) < COORD_THRESHOLD,
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
    setIsSavingPin(true);

    try {
      const { address } = await reverseGeocode(clickedLocation);
      dispatch(
        localStopAdded({
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

  const handleDeleteStop = useCallback(() => {
    if (!contextMenuStopId) return;
    dispatch(closeContextMenu());
    dispatch(localStopDeleted(contextMenuStopId));
  }, [contextMenuStopId, dispatch]);

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragEndEvent, stopId: string): Promise<void> => {
      if (draggingStopId !== stopId) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch(stopDraggingStop());

      try {
        const { address } = await reverseGeocode({ latitude, longitude });
        dispatch(
          localStopMoved({ stopId, latitude, longitude, address }),
        );
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not look up that place.',
        });
      }
    },
    [dispatch, draggingStopId],
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

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) =>
      dispatch(localStopsReordered({ from, to })),
    [dispatch],
  );

  const handleDeleteStopById = useCallback(
    (stopId: string) => dispatch(localStopDeleted(stopId)),
    [dispatch],
  );

  const handleToggleFavoriteStop = useCallback(
    (stopId: string) => dispatch(localStopFavoriteToggled(stopId)),
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
      setIsSavingPin(true);

      try {
        const { address } = await reverseGeocode(place).catch(() => ({
          address: place.address,
        }));

        dispatch(
          localStopAdded({
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.name || address,
            insertAtIndex: place.insertAfterIndex + 1,
          }),
        );

        showNotification({
          type: 'success',
          header: 'Added to your route',
          message: `${place.name} is now a stop on this route.`,
        });
      } finally {
        setIsSavingPin(false);
      }
    },
    [dispatch],
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
    mapRef,
    bottomSheetRef,
    isHydrated,
    isSavingPin,
    activeRoad,
    roads,
    stops,
    measuredStops,
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
    handleReorder,
    handleDeleteStopById,
    handleToggleFavoriteStop,
  };
};

export default useLocalMapLogic;
