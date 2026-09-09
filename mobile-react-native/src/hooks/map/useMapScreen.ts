import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import useConfirm from 'hooks/feedback/useConfirm';
import useLocalMapLogic from 'hooks/map/useLocalMapLogic';
import useStopPair from 'hooks/map/useStopPair';
import { RoutePlace } from 'services/mapsService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  localRouteCreated,
  localRouteDeleted,
  localRouteDetailsChanged,
  localRouteSelected,
} from 'store/slices/localRouteSlice';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';

/** Fractions of the window the bottom sheet rests at. */
const SNAP_RATIOS = [0.22, 0.45, 0.75];

/**
 * Everything the map screen needs to think about, so the screen itself only has
 * to lay it out: the route data from {@link useLocalMapLogic}, the compared pair
 * of stops, and the four overlays (details editor, route picker, place search,
 * drag/reorder) whose open state is the screen's own.
 */
export function useMapScreen() {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { height: windowHeight } = useWindowDimensions();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const map = useLocalMapLogic();
  const stopPair = useStopPair();

  const { activeRoute, routes, routeLine, focusOnPlace, handleAddPlaceAsStop } =
    map;

  const [isReordering, setIsReordering] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [isPickingRoute, setIsPickingRoute] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const openRouteSearch = useCallback(() => setIsSearchingRoute(true), []);
  const closeRouteSearch = useCallback(() => setIsSearchingRoute(false), []);
  const openDetailsEditor = useCallback(() => setIsEditingDetails(true), []);
  const closeDetailsEditor = useCallback(() => setIsEditingDetails(false), []);
  const closePicker = useCallback(() => setIsPickingRoute(false), []);
  const openImport = useCallback(() => setIsImporting(true), []);
  const closeImport = useCallback(() => setIsImporting(false), []);

  const handleShowOnMap = useCallback(
    (place: RoutePlace) => {
      setIsSearchingRoute(false);
      focusOnPlace(place);
    },
    [focusOnPlace],
  );

  const handleAddStop = useCallback(
    (place: RoutePlace) => {
      setIsSearchingRoute(false);
      handleAddPlaceAsStop(place);
    },
    [handleAddPlaceAsStop],
  );

  const snapPoints = useMemo(() => {
    const points = SNAP_RATIOS.map((ratio) => Math.round(windowHeight * ratio));
    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [windowHeight]);

  const summary = useMemo(() => {
    if (routeLine.durationSeconds === undefined) return undefined;
    return {
      duration: secondsToHour(routeLine.durationSeconds),
      distance: metersToDistance(routeLine.distanceMeters),
    };
  }, [routeLine.distanceMeters, routeLine.durationSeconds]);

  const handleNewRoute = useCallback(() => {
    dispatch(localRouteCreated(`Route ${routes.length + 1}`));
  }, [dispatch, routes.length]);

  const handleSwitchRoute = useCallback(() => {
    if (routes.length > 1) setIsPickingRoute(true);
  }, [routes.length]);

  const handlePickRoute = useCallback(
    (routeId: string) => {
      dispatch(localRouteSelected(routeId));
      setIsPickingRoute(false);
    },
    [dispatch],
  );

  const handleDeleteRoute = useCallback(async () => {
    if (!activeRoute) return;
    const confirmed = await confirm({
      title: 'Delete route',
      message: `“${activeRoute.title}” and its ${activeRoute.stops.length} stop${
        activeRoute.stops.length === 1 ? '' : 's'
      } will be removed from this device.`,
      confirmLabel: 'Delete',
      icon: 'trash-outline',
      tone: 'danger',
    });
    if (confirmed) dispatch(localRouteDeleted(activeRoute.id));
  }, [activeRoute, confirm, dispatch]);

  const handleSaveDetails = useCallback(
    ({ title, description }: DetailsDraft) => {
      if (!activeRoute) return;
      dispatch(
        localRouteDetailsChanged({ routeId: activeRoute.id, title, description }),
      );
      setIsEditingDetails(false);
    },
    [activeRoute, dispatch],
  );

  return {
    ...map,
    isLoggedIn,
    stopPair,
    snapPoints,
    summary,
    // The sheet has to let go of the gestures while a row is being dragged,
    // otherwise the sheet moves instead of the row.
    sheetGesturesEnabled: !map.draggingStopId && !isReordering,
    setIsReordering,
    isEditingDetails,
    openDetailsEditor,
    closeDetailsEditor,
    handleSaveDetails,
    isSearchingRoute,
    openRouteSearch,
    closeRouteSearch,
    handleShowOnMap,
    handleAddStop,
    isImporting,
    openImport,
    closeImport,
    isPickingRoute,
    handleSwitchRoute,
    handlePickRoute,
    closePicker,
    handleNewRoute,
    handleDeleteRoute,
  };
}

export default useMapScreen;
