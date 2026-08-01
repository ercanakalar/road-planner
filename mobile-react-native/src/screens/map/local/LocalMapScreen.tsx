import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlacesSearchBar from 'components/PlacesSearchBar';
import ContextMenu from 'components/ContextMenu';
import ScreenState from 'components/ScreenState';
import BottomSheetHandle from 'components/BottomSheetHandle';
import { MapSection } from 'screens/map/roads/MapSection';
import LocalWaypointList from './LocalWaypointList';

import useLocalMapLogic from 'hooks/useLocalMapLogic';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  localRoadCreated,
  localRoadDeleted,
  localRoadSelected,
} from 'store/slices/localRoadSlice';

import { colors, radius, shadows, spacing, typography } from 'theme';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';


const LocalMapScreen = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const [isReordering, setIsReordering] = useState(false);

  const {
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
  } = useLocalMapLogic();

  const snapPoints = useMemo(() => {
    const points = [0.22, 0.45, 0.75].map((ratio) =>
      Math.round(windowHeight * ratio),
    );
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
    if (roads.length < 2) return;
    Alert.alert(
      'Switch route',
      'Pick the route to edit.',
      [
        ...roads.slice(0, 8).map((road) => ({
          text: `${road.title} · ${road.wayPoints.length} stops`,
          onPress: () => dispatch(localRoadSelected(road.id)),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  }, [dispatch, roads]);

  const handleDeleteRoad = useCallback(() => {
    if (!activeRoad) return;
    Alert.alert('Delete route', `“${activeRoad.title}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(localRoadDeleted(activeRoad.id)),
      },
    ]);
  }, [activeRoad, dispatch]);

  if (!isHydrated) {
    return <ScreenState variant='loading' title='Opening the map…' />;
  }

  const sheetGesturesEnabled = !draggingWaypointId && !isReordering;

  return (
    <>
      <View style={styles.container}>
        <MapSection
          mapRef={mapRef}
          waypoints={waypoints}
          draggingWaypointId={draggingWaypointId}
          routeCoordinates={routeLine.coordinates}
          summary={summary}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
          onMapPress={handleMapPress}
        />

        <View style={[styles.searchSlot, { top: insets.top }]}>
          <PlacesSearchBar onPlaceSelected={onPlaceSelected} />
        </View>

        <View style={[styles.toolbar, { top: insets.top + 64 }]}>
          <Pressable
            style={styles.roadChip}
            onPress={handleSwitchRoad}
            disabled={roads.length < 2}
            accessibilityRole='button'
            accessibilityLabel='Switch route'
          >
            <Ionicons name='git-branch-outline' size={15} color={colors.primary} />
            <Text style={styles.roadChipText} numberOfLines={1}>
              {activeRoad?.title ?? 'New route'}
            </Text>
            {roads.length > 1 ? (
              <Ionicons name='chevron-down' size={14} color={colors.textMuted} />
            ) : null}
          </Pressable>

          <Pressable
            style={styles.iconChip}
            onPress={handleNewRoad}
            accessibilityRole='button'
            accessibilityLabel='Start a new route'
          >
            <Ionicons name='add' size={18} color={colors.primary} />
          </Pressable>

          {activeRoad ? (
            <Pressable
              style={styles.iconChip}
              onPress={handleDeleteRoad}
              accessibilityRole='button'
              accessibilityLabel='Delete this route'
            >
              <Ionicons name='trash-outline' size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>

        {isSavingPin ? (
          <View style={[styles.pill, { top: insets.top + 112 }]}>
            <Text style={styles.pillText}>Looking up that place…</Text>
          </View>
        ) : null}

        {!isLoggedIn && waypoints.length > 0 ? (
          <View style={[styles.pill, styles.localPill, { top: insets.top + 112 }]}>
            <Ionicons name='phone-portrait-outline' size={13} color={colors.warning} />
            <Text style={styles.pillText}>Saved on this device</Text>
          </View>
        ) : null}

        <ContextMenu {...contextMenuProps} />
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={false}
        enableContentPanningGesture={sheetGesturesEnabled}
        enableHandlePanningGesture={sheetGesturesEnabled}
        enableDynamicSizing={false}
        handleComponent={BottomSheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <LocalWaypointList
          waypoints={waypoints}
          transportMode={transportMode}
          onTransportModeChange={setTransportMode}
          onDeleteWaypoint={handleDeleteWaypointById}
          onReorder={handleReorder}
          onReorderingChange={setIsReordering}
        />
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  toolbar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '65%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  roadChipText: {
    ...typography.label,
    color: colors.text,
    flexShrink: 1,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  localPill: {
    backgroundColor: colors.surface,
  },
  pillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  sheetBackground: { backgroundColor: colors.surface },
});

export default LocalMapScreen;
