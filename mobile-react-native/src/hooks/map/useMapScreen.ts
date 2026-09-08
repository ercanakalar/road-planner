import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import useConfirm from 'hooks/feedback/useConfirm';
import useLocalMapLogic from 'hooks/map/useLocalMapLogic';
import useStopPair from 'hooks/map/useStopPair';
import { RoutePlace } from 'services/mapsService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  localRoadCreated,
  localRoadDeleted,
  localRoadDetailsChanged,
  localRoadSelected,
} from 'store/slices/localRoadSlice';
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

  const { activeRoad, roads, routeLine, focusOnPlace, handleAddPlaceAsStop } =
    map;

  const [isReordering, setIsReordering] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [isPickingRoad, setIsPickingRoad] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const openRouteSearch = useCallback(() => setIsSearchingRoute(true), []);
  const closeRouteSearch = useCallback(() => setIsSearchingRoute(false), []);
  const openDetailsEditor = useCallback(() => setIsEditingDetails(true), []);
  const closeDetailsEditor = useCallback(() => setIsEditingDetails(false), []);
  const closePicker = useCallback(() => setIsPickingRoad(false), []);
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

  const handleNewRoad = useCallback(() => {
    dispatch(localRoadCreated(`Route ${roads.length + 1}`));
  }, [dispatch, roads.length]);

  const handleSwitchRoad = useCallback(() => {
    if (roads.length > 1) setIsPickingRoad(true);
  }, [roads.length]);

  const handlePickRoad = useCallback(
    (roadId: string) => {
      dispatch(localRoadSelected(roadId));
      setIsPickingRoad(false);
    },
    [dispatch],
  );

  const handleDeleteRoad = useCallback(async () => {
    if (!activeRoad) return;
    const confirmed = await confirm({
      title: 'Delete route',
      message: `“${activeRoad.title}” and its ${activeRoad.stops.length} stop${
        activeRoad.stops.length === 1 ? '' : 's'
      } will be removed from this device.`,
      confirmLabel: 'Delete',
      icon: 'trash-outline',
      tone: 'danger',
    });
    if (confirmed) dispatch(localRoadDeleted(activeRoad.id));
  }, [activeRoad, confirm, dispatch]);

  const handleSaveDetails = useCallback(
    ({ title, description }: DetailsDraft) => {
      if (!activeRoad) return;
      dispatch(
        localRoadDetailsChanged({ roadId: activeRoad.id, title, description }),
      );
      setIsEditingDetails(false);
    },
    [activeRoad, dispatch],
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
    isPickingRoad,
    handleSwitchRoad,
    handlePickRoad,
    closePicker,
    handleNewRoad,
    handleDeleteRoad,
  };
}

export default useMapScreen;
