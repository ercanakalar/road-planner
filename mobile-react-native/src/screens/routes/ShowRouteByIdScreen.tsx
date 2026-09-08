import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlacesSearchBar from 'components/map/PlacesSearchBar';
import RouteSearchSheet from 'components/map/RouteSearchSheet';
import ContextMenu from 'components/ui/ContextMenu';
import ScreenState from 'components/ui/ScreenState';
import BottomSheetHandle from 'components/ui/BottomSheetHandle';
import EnhancedWaypointList from './EnhancedWaypointList';
import { MapSection } from 'components/map/MapSection';

import useMapLogic from 'hooks/map/useMapLogic';
import useWaypointPair from 'hooks/map/useWaypointPair';
import { RoutePlace } from 'services/mapsService';
import { radius, shadows, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';

const ShowRouteByIdScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const {
    roadId,
    mapRef,
    bottomSheetRef,
    isLoading,
    waypoints,
    routeLine,
    routeSearch,
    transportMode,
    setTransportMode,
    draggingWaypointId,
    contextMenuProps,
    onPlaceSelected,
    focusOnPlace,
    handleAddPlaceAsStop,
    handleMarkerDragEnd,
    handleMapLongPress,
    handleMapPress,
  } = useMapLogic();

  const waypointPair = useWaypointPair();

  const { height: windowHeight } = useWindowDimensions();
  const [isReordering, setIsReordering] = useState(false);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);

  const openRouteSearch = useCallback(() => setIsSearchingRoute(true), []);
  const closeRouteSearch = useCallback(() => setIsSearchingRoute(false), []);

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

  const handleReorderingChange = useCallback(
    (reordering: boolean) => setIsReordering(reordering),
    [],
  );

  if (isLoading && waypoints.length === 0) {
    return <ScreenState variant='loading' title='Loading route…' />;
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
          transportMode={transportMode}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
          onMapPress={handleMapPress}
          foundPlaces={routeSearch.places}
          onFoundPlacePress={focusOnPlace}
          selectedWaypointIds={waypointPair.selected}
        />

        <PlacesSearchBar onPlaceSelected={onPlaceSelected} />

        {routeSearch.isRoutable ? (
          <Pressable
            style={[styles.onTheWay, { top: insets.top + 64 }]}
            onPress={openRouteSearch}
            accessibilityRole='button'
            accessibilityLabel='Search for places along this route'
          >
            <Ionicons
              name='restaurant-outline'
              size={15}
              color={colors.primary}
            />
            <Text style={styles.onTheWayText}>
              {routeSearch.places.length > 0
                ? `${routeSearch.places.length} on the way`
                : 'On the way'}
            </Text>
          </Pressable>
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
        <EnhancedWaypointList
          roadId={roadId}
          transportMode={transportMode}
          selectedPair={waypointPair.selected}
          onToggleSelection={waypointPair.toggle}
          onForgetSelection={waypointPair.forget}
          onTransportModeChange={setTransportMode}
          onReorderingChange={handleReorderingChange}
        />
      </BottomSheet>

      <RouteSearchSheet
        visible={isSearchingRoute}
        search={routeSearch}
        onClose={closeRouteSearch}
        onShowOnMap={handleShowOnMap}
        onAddStop={handleAddStop}
      />
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sheetBackground: {
      backgroundColor: colors.surface,
    },
    onTheWay: {
      position: 'absolute',
      left: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    onTheWayText: {
      ...typography.label,
      color: colors.text,
    },
  });

export default memo(ShowRouteByIdScreen);
